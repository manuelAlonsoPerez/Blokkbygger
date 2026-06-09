import { describe, it, expect } from "vitest";
import { transformApiData } from "../../src/utils/transformApiData";
import {
  MOCK_ELECTION_RESPONSE,
  MOCK_EMPTY_RESPONSE,
  buildApiPartyWithNullPercent,
} from "../fixtures/electionData";
import {
  ANDRE_PARTY_ID,
  ANDRE_PARTY_NAME,
  ANDRE_PARTY_COLOR,
} from "../../src/config";
import { suite, spec, step, data, pass } from "./testLogger";

suite("transformApiData");

describe("transformApiData", () => {
  it("extracts category-1 parties as individual entries", () => {
    spec("extracts category-1 parties as individual entries");
    step("Transforming mock API response with 11 parties");
    const parties = transformApiData(MOCK_ELECTION_RESPONSE);

    step("Looking up Arbeiderpartiet (id=A)");
    const ap = parties.find((p) => p.id === "A");
    expect(ap).toBeDefined();
    expect(ap!.name).toBe("Arbeiderpartiet");
    expect(ap!.shortName).toBe("AP");
    expect(ap!.mandates).toBe(48);
    expect(ap!.percentage).toBe(26.3);
    expect(ap!.color).toBe("#d40000");
    data("name", ap!.name);
    data("mandates", ap!.mandates);
    data("percentage", `${ap!.percentage}%`);
    data("color", ap!.color);
    pass("AP extracted with correct fields");
  });

  it("aggregates non-category-1 parties into a single 'Andre' entry", () => {
    spec("aggregates non-category-1 parties into 'Andre'");
    step("Transforming response to check Andre aggregation");
    const parties = transformApiData(MOCK_ELECTION_RESPONSE);

    step(`Looking up Andre entry (id=${ANDRE_PARTY_ID})`);
    const andre = parties.find((p) => p.id === ANDRE_PARTY_ID);
    expect(andre).toBeDefined();
    expect(andre!.name).toBe(ANDRE_PARTY_NAME);
    expect(andre!.color).toBe(ANDRE_PARTY_COLOR);
    expect(andre!.mandates).toBe(1);
    expect(andre!.percentage).toBe(0.6);
    data("mandates", andre!.mandates);
    data("percentage", `${andre!.percentage}%`);
    data("color", andre!.color);
    pass("Andre aggregated from 2 minor parties: PASIENT + DEMO");
  });

  it("produces correct party count (9 category-1 + 1 andre)", () => {
    spec("produces correct party count");
    step("Counting parties from full API response");
    const parties = transformApiData(MOCK_ELECTION_RESPONSE);
    expect(parties).toHaveLength(10);
    data("party count", `${parties.length} (9 nationwide + 1 andre)`);
    pass("Party count is 10");
  });

  it("handles empty partier array — still produces an Andre entry", () => {
    spec("handles empty partier array");
    step("Transforming response with zero parties");
    const parties = transformApiData(MOCK_EMPTY_RESPONSE);
    expect(parties).toHaveLength(1);
    expect(parties[0].id).toBe(ANDRE_PARTY_ID);
    expect(parties[0].mandates).toBe(0);
    expect(parties[0].percentage).toBe(0);
    data("output", `${parties.length} party → id=${parties[0].id}, mandates=${parties[0].mandates}, percentage=${parties[0].percentage}%`);
    pass("Empty input still produces Andre with 0 mandates");
  });

  it("guards against null percentage values (NaN prevention)", () => {
    spec("guards against null percentage (NaN prevention)");
    step("Building response with null stemmer.prosent value");
    const response = buildApiPartyWithNullPercent();
    const parties = transformApiData(response);

    step("Checking TEST party percentage is numeric");
    const test = parties.find((p) => p.id === "TEST");
    expect(test).toBeDefined();
    expect(test!.percentage).toBe(0);
    expect(Number.isNaN(test!.percentage)).toBe(false);
    data("percentage", test!.percentage);
    data("isNaN", Number.isNaN(test!.percentage));
    pass("Null percentage safely defaults to 0 (no NaN)");
  });

  it("rounds Andre percentage to one decimal place", () => {
    spec("rounds Andre percentage to one decimal place");
    step("Checking Andre percentage precision");
    const parties = transformApiData(MOCK_ELECTION_RESPONSE);
    const andre = parties.find((p) => p.id === ANDRE_PARTY_ID)!;
    const decimalPlaces = andre.percentage.toString().split(".")[1]?.length ?? 0;
    expect(decimalPlaces).toBeLessThanOrEqual(1);
    data("Andre percentage", `${andre.percentage} (${decimalPlaces} decimal places)`);
    pass("Andre percentage rounded to <= 1 decimal place");
  });

  it("preserves party order — category-1 parties appear in API order", () => {
    spec("preserves party order from API");
    step("Checking output party order matches input order");
    const parties = transformApiData(MOCK_ELECTION_RESPONSE);
    const ids = parties.map((p) => p.id);
    expect(ids[0]).toBe("A");
    expect(ids[1]).toBe("H");
    expect(ids[ids.length - 1]).toBe(ANDRE_PARTY_ID);
    data("order", `[${ids[0]}, ${ids[1]}, ..., ${ids[ids.length - 1]}]`);
    pass("First=A, second=H, last=andre — matches API order");
  });
});
