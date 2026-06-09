import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useElectionData } from "../../src/hooks/useElectionData";
import { MOCK_ELECTION_RESPONSE } from "../fixtures/electionData";
import { suite, spec, step, data, pass } from "../utils/testLogger";

const API_URL = "https://valg.nrk.no/api/2025/st";
const POLL_MS = 30_000;

function mockFetchSuccess(d = MOCK_ELECTION_RESPONSE) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(d),
  });
}

function mockFetchHttpError(status = 500) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({}),
  });
}

function mockFetchNetworkError() {
  return vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

suite("useElectionData hook");

describe("useElectionData", () => {
  // --- Successful fetch ---

  it("fetches data on mount and populates party list", async () => {
    spec("fetches data on mount and populates party list");
    step("Mocking fetch → 200 OK with election data");
    global.fetch = mockFetchSuccess();

    step("Rendering useElectionData hook");
    const { result } = renderHook(() => useElectionData(API_URL, POLL_MS));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.parties.length).toBeGreaterThan(0);
    expect(result.current.error).toBeNull();
    data("parties", result.current.parties.length);
    data("error", result.current.error);
    pass("Parties populated, no error");
  });

  it("extracts totalMandates from API response", async () => {
    spec("extracts totalMandates from API response");
    step("Mocking fetch → 200 OK");
    global.fetch = mockFetchSuccess();
    const { result } = renderHook(() => useElectionData(API_URL, POLL_MS));
    await waitFor(() => expect(result.current.totalMandates).toBe(169));
    data("totalMandates", result.current.totalMandates);
    pass("totalMandates = 169 (from mandater.antall)");
  });

  it("extracts turnoutPercent from API response", async () => {
    spec("extracts turnoutPercent from API response");
    step("Mocking fetch → 200 OK");
    global.fetch = mockFetchSuccess();
    const { result } = renderHook(() => useElectionData(API_URL, POLL_MS));
    await waitFor(() => expect(result.current.turnoutPercent).toBe(78.2));
    data("turnoutPercent", `${result.current.turnoutPercent}%`);
    pass("turnoutPercent = 78.2 (from frammote.prosent)");
  });

  it("extracts countedPercent from API response", async () => {
    spec("extracts countedPercent from API response");
    step("Mocking fetch → 200 OK");
    global.fetch = mockFetchSuccess();
    const { result } = renderHook(() => useElectionData(API_URL, POLL_MS));
    await waitFor(() => expect(result.current.countedPercent).toBe(95.4));
    data("countedPercent", `${result.current.countedPercent}%`);
    pass("countedPercent = 95.4 (from opptaltProsent)");
  });

  it("sets lastUpdated from API timestamp", async () => {
    spec("sets lastUpdated from API timestamp");
    step("Mocking fetch → 200 OK");
    global.fetch = mockFetchSuccess();
    const { result } = renderHook(() => useElectionData(API_URL, POLL_MS));
    await waitFor(() => expect(result.current.lastUpdated).toBe("2025-09-10T08:56:00"));
    data("lastUpdated", result.current.lastUpdated);
    pass("Timestamp extracted from tidspunkt.rapportGenerert");
  });

  it("starts in loading state with no error", () => {
    spec("starts in loading state with no error");
    step("Rendering hook and checking initial state synchronously");
    global.fetch = mockFetchSuccess();
    const { result } = renderHook(() => useElectionData(API_URL, POLL_MS));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.parties).toEqual([]);
    data("isLoading", result.current.isLoading);
    data("error", result.current.error);
    data("parties", result.current.parties.length);
    pass("Initial state: loading=true, error=null, parties=[]");
  });

  // --- Error cases ---

  it("sets error message on HTTP error (non-200 response)", async () => {
    spec("sets error on HTTP 500");
    step("Mocking fetch → HTTP 500");
    global.fetch = mockFetchHttpError(500);
    const { result } = renderHook(() => useElectionData(API_URL, POLL_MS));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    step("Verifying error message and empty parties");
    expect(result.current.error).toBe("Kunne ikke hente valgdata. Prøver igjen...");
    expect(result.current.parties).toEqual([]);
    data("error", `"${result.current.error}"`);
    data("parties", result.current.parties.length);
    pass("Error message set, parties remain empty");
  });

  it("sets error message on network failure", async () => {
    spec("sets error on network failure (TypeError)");
    step("Mocking fetch → throws TypeError('Failed to fetch')");
    global.fetch = mockFetchNetworkError();
    const { result } = renderHook(() => useElectionData(API_URL, POLL_MS));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe("Kunne ikke hente valgdata. Prøver igjen...");
    data("error", `"${result.current.error}"`);
    pass("Network failure caught and error message set");
  });

  it("sets error on 404 response", async () => {
    spec("sets error on HTTP 404");
    step("Mocking fetch → HTTP 404");
    global.fetch = mockFetchHttpError(404);
    const { result } = renderHook(() => useElectionData(API_URL, POLL_MS));
    await waitFor(() => expect(result.current.error).not.toBeNull());
    data("error", `"${result.current.error}"`);
    pass("404 treated as error");
  });

  it("preserves last successful data when a subsequent fetch fails", async () => {
    spec("preserves data after subsequent fetch failure");
    step("Mocking fetch → 200 OK (initial load)");
    const fetchMock = mockFetchSuccess();
    global.fetch = fetchMock;
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { result } = renderHook(() => useElectionData(API_URL, POLL_MS));

    await waitFor(() => expect(result.current.parties.length).toBeGreaterThan(0));
    const partyCount = result.current.parties.length;
    const savedMandates = result.current.totalMandates;
    data("initial parties", partyCount);
    data("initial mandates", savedMandates);

    step("Making next poll return HTTP 500");
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    await act(async () => { vi.advanceTimersByTime(POLL_MS); });
    await waitFor(() => expect(result.current.error).not.toBeNull());

    step("Verifying data persisted through failure");
    expect(result.current.parties).toHaveLength(partyCount);
    expect(result.current.totalMandates).toBe(savedMandates);
    data("parties after failure", result.current.parties.length);
    data("mandates after failure", result.current.totalMandates);
    data("error", `"${result.current.error}"`);
    pass("Data preserved: parties and mandates unchanged despite error");
  });

  it("clears error after a subsequent successful fetch", async () => {
    spec("clears error after recovery");
    step("Mocking fetch → network error (initial failure)");
    const fetchMock = mockFetchNetworkError();
    global.fetch = fetchMock;
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { result } = renderHook(() => useElectionData(API_URL, POLL_MS));

    await waitFor(() => expect(result.current.error).not.toBeNull());
    data("error before recovery", `"${result.current.error}"`);

    step("Making next poll return 200 OK");
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_ELECTION_RESPONSE),
    });
    await act(async () => { vi.advanceTimersByTime(POLL_MS); });
    await waitFor(() => expect(result.current.error).toBeNull());

    expect(result.current.parties.length).toBeGreaterThan(0);
    data("error after recovery", result.current.error);
    data("parties after recovery", result.current.parties.length);
    pass("Error cleared, data loaded on recovery");
  });

  // --- Polling ---

  it("polls at the configured interval", async () => {
    spec("polls at the configured interval");
    const fetchMock = mockFetchSuccess();
    global.fetch = fetchMock;
    vi.useFakeTimers({ shouldAdvanceTime: true });

    step(`Rendering hook with pollIntervalMs=${POLL_MS}`);
    renderHook(() => useElectionData(API_URL, POLL_MS));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    data("after mount", `${fetchMock.mock.calls.length} call(s)`);

    step("Advancing by 1 interval (30s)");
    await act(async () => { vi.advanceTimersByTime(POLL_MS); });
    data("after +30s", `${fetchMock.mock.calls.length} call(s)`);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    step("Advancing by 1 more interval (60s total)");
    await act(async () => { vi.advanceTimersByTime(POLL_MS); });
    data("after +60s", `${fetchMock.mock.calls.length} call(s)`);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    pass("Polling confirmed: 1 initial + 2 intervals = 3 total fetches");
  });

  it("stops polling on unmount (no leaked timers)", async () => {
    spec("stops polling on unmount (no leaked timers)");
    const fetchMock = mockFetchSuccess();
    global.fetch = fetchMock;
    vi.useFakeTimers({ shouldAdvanceTime: true });

    step("Rendering hook");
    const { unmount } = renderHook(() => useElectionData(API_URL, POLL_MS));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    data("before unmount", `${fetchMock.mock.calls.length} call(s)`);

    step("Unmounting hook");
    unmount();

    step("Advancing time by 3 intervals (90s) after unmount");
    await act(async () => { vi.advanceTimersByTime(POLL_MS * 3); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    data("after unmount + 90s", `${fetchMock.mock.calls.length} call(s) (no increase)`);
    pass("No leaked timers — fetch count stayed at 1");
  });

  it("calls fetch with the provided API URL", async () => {
    spec("calls fetch with provided API URL");
    const customUrl = "https://example.com/api/test";
    step(`Setting custom URL: ${customUrl}`);
    global.fetch = mockFetchSuccess();
    renderHook(() => useElectionData(customUrl, POLL_MS));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(customUrl));
    data("fetch called with", (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    pass("Custom API URL passed to fetch()");
  });
});
