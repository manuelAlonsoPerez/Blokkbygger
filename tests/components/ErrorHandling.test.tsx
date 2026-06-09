import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { Blokkbygger } from "../../src/components/Blokkbygger/Blokkbygger";
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

suite("Blokkbygger — Error handling integration");

describe("Blokkbygger — Error handling integration", () => {
  it("shows loading message before API responds", () => {
    spec("shows loading message before API responds");
    step("Mocking fetch as never-resolving promise");
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    step("Rendering <Blokkbygger />");
    render(<Blokkbygger apiUrl={API_URL} pollIntervalMs={POLL_MS} />);

    step("Checking for loading text");
    expect(screen.getByText("Laster valgdata...")).toBeInTheDocument();
    data("visible text", '"Laster valgdata..."');
    pass("Loading message shown while awaiting API");
  });

  it("renders party cards after successful API fetch", async () => {
    spec("renders party cards after successful fetch");
    step("Mocking fetch → 200 OK");
    global.fetch = mockFetchSuccess();

    step("Rendering <Blokkbygger />");
    render(<Blokkbygger apiUrl={API_URL} pollIntervalMs={POLL_MS} />);

    step("Waiting for party cards to appear");
    await waitFor(() => expect(screen.getByText("AP")).toBeInTheDocument());
    expect(screen.getByText("H")).toBeInTheDocument();
    expect(screen.getByText("SV")).toBeInTheDocument();
    data("visible cards", "AP, H, SV");
    pass("Party cards rendered after successful API response");
  });

  it("shows ErrorBanner with role=alert on HTTP error", async () => {
    spec("shows ErrorBanner on HTTP 500");
    step("Mocking fetch → HTTP 500");
    global.fetch = mockFetchHttpError(500);

    step("Rendering <Blokkbygger />");
    render(<Blokkbygger apiUrl={API_URL} pollIntervalMs={POLL_MS} />);

    step("Waiting for error banner (role=alert)");
    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent("Kunne ikke hente valgdata. Prøver igjen...");
    });
    data("banner text", '"Kunne ikke hente valgdata. Prøver igjen..."');
    data("role", "alert");
    pass("ErrorBanner visible with correct message and ARIA role");
  });

  it("shows ErrorBanner on network failure", async () => {
    spec("shows ErrorBanner on network failure");
    step("Mocking fetch → TypeError('Failed to fetch')");
    global.fetch = mockFetchNetworkError();

    step("Rendering <Blokkbygger />");
    render(<Blokkbygger apiUrl={API_URL} pollIntervalMs={POLL_MS} />);

    step("Waiting for error banner");
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    pass("ErrorBanner visible after network failure");
  });

  it("keeps party data visible when a poll fails after initial success", async () => {
    spec("graceful degradation — data persists through poll failure");
    step("Mocking fetch → 200 OK (initial load)");
    const fetchMock = mockFetchSuccess();
    global.fetch = fetchMock;
    vi.useFakeTimers({ shouldAdvanceTime: true });

    render(<Blokkbygger apiUrl={API_URL} pollIntervalMs={POLL_MS} />);

    step("Waiting for initial party cards");
    await waitFor(() => expect(screen.getByText("AP")).toBeInTheDocument());
    data("initial state", "AP, H, SV visible — no error banner");

    step("Making next poll return HTTP 503");
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });
    await act(async () => { vi.advanceTimersByTime(POLL_MS); });

    step("Checking error banner appeared");
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    step("Verifying party cards still visible alongside error");
    expect(screen.getByText("AP")).toBeInTheDocument();
    expect(screen.getByText("H")).toBeInTheDocument();
    data("after failure", "error banner + AP + H all visible");
    pass("Graceful degradation: error banner coexists with party data");
  });

  it("removes ErrorBanner when API recovers on next poll", async () => {
    spec("recovery — ErrorBanner removed after successful poll");
    step("Mocking fetch → HTTP 500 (initial failure)");
    const fetchMock = mockFetchHttpError(500);
    global.fetch = fetchMock;
    vi.useFakeTimers({ shouldAdvanceTime: true });

    render(<Blokkbygger apiUrl={API_URL} pollIntervalMs={POLL_MS} />);

    step("Waiting for error banner");
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    data("before recovery", "error banner visible");

    step("Making next poll return 200 OK");
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_ELECTION_RESPONSE),
    });
    await act(async () => { vi.advanceTimersByTime(POLL_MS); });

    step("Checking error banner removed");
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(screen.getByText("AP")).toBeInTheDocument();
    data("after recovery", "error banner gone, AP visible");
    pass("Recovery complete — error cleared, data rendered");
  });

  it("displays header stats after successful fetch", async () => {
    spec("displays header stats after successful fetch");
    step("Mocking fetch → 200 OK");
    global.fetch = mockFetchSuccess();

    render(<Blokkbygger apiUrl={API_URL} pollIntervalMs={POLL_MS} />);

    step("Waiting for header to render");
    await waitFor(() => expect(screen.getByText("Blokkbygger")).toBeInTheDocument());

    step("Checking stat values");
    expect(screen.getByText("78.2%")).toBeInTheDocument();
    expect(screen.getByText("95.4%")).toBeInTheDocument();
    expect(screen.getByText("169")).toBeInTheDocument();
    expect(screen.getByText("85")).toBeInTheDocument();
    data("Frammøte", "78.2%");
    data("Opptalt", "95.4%");
    data("Mandater", 169);
    data("Flertall", 85);
    pass("All header stats rendered correctly");
  });

  it("renders three block sections", async () => {
    spec("renders three block sections");
    step("Mocking fetch → 200 OK");
    global.fetch = mockFetchSuccess();

    render(<Blokkbygger apiUrl={API_URL} pollIntervalMs={POLL_MS} />);

    step("Waiting for block sections");
    await waitFor(() => expect(screen.getByTestId("block-left")).toBeInTheDocument());
    expect(screen.getByTestId("block-neutral")).toBeInTheDocument();
    expect(screen.getByTestId("block-right")).toBeInTheDocument();
    data("blocks", "block-left, block-neutral, block-right");
    pass("All three blocks rendered");
  });

  it("does not show ErrorBanner on successful fetch", async () => {
    spec("no ErrorBanner on successful fetch");
    step("Mocking fetch → 200 OK");
    global.fetch = mockFetchSuccess();

    render(<Blokkbygger apiUrl={API_URL} pollIntervalMs={POLL_MS} />);

    step("Waiting for data to load");
    await waitFor(() => expect(screen.getByText("AP")).toBeInTheDocument());

    step("Checking no error banner exists");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    data("alert element", "not present");
    pass("No ErrorBanner when API succeeds");
  });
});
