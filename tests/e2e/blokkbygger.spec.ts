import { test, expect, type Page } from "@playwright/test";

const API_URL = "https://valg.nrk.no/api/2025/st";

const R = "\x1b[0m";
const B = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const MAGENTA = "\x1b[35m";
const WHITE = "\x1b[37m";
const BG_GREEN = "\x1b[42m";
const BG_CYAN = "\x1b[46m";
const BG_MAGENTA = "\x1b[45m";

const LINE = `${DIM}${"─".repeat(60)}${R}`;
const logSuite = (n: string) => { console.log(""); console.log(`${B}${BG_MAGENTA}${WHITE} SUITE ${R} ${B}${MAGENTA}${n}${R}`); console.log(LINE); };
const logSpec = (n: string) => { console.log(""); console.log(`  ${B}${BG_CYAN}${WHITE} TEST ${R}  ${B}${CYAN}${n}${R}`); };
const logStep = (m: string) => console.log(`  ${DIM}│${R}  ${YELLOW}→${R} ${m}`);
const logData = (l: string, v: unknown) => console.log(`  ${DIM}│${R}  ${DIM}  ↳ ${l}:${R} ${B}${WHITE}${v}${R}`);
const logPass = (m: string) => { console.log(`  ${DIM}│${R}`); console.log(`  ${DIM}└${R}  ${BG_GREEN}${B}${WHITE} PASS ${R} ${GREEN}${m}${R}`); };

const MOCK_RESPONSE = {
  resultatType: "st",
  tidspunkt: { rapportGenerert: "2025-09-10T08:56:00", sisteStemmer: "2025-09-10T08:55:00" },
  valg: { year: 2025, type: "st" },
  geografi: { key: "00", navn: { nb: "Hele landet", sme: "Norga" }, type: "land", stemmeberettigede: 3_900_000 },
  mandater: { antall: 169, endring: 0 },
  antallStemmer: 2_800_000,
  frammote: { prosent: 78.2 },
  opptaltProsent: 95.4,
  partier: [
    { parti: { id: "A", navn: { nb: "Arbeiderpartiet", nn: "Arbeidarpartiet" }, kortNavn: "AP", kategori: 1, isParti: true, farge: "#d40000" }, stemmer: { prosent: 26.3, endring: { samme: 0.5 }, antall: { total: 736400, fhs: 0 } }, mandater: { antall: 48, endring: 0 } },
    { parti: { id: "H", navn: { nb: "Høyre", nn: "Høgre" }, kortNavn: "H", kategori: 1, isParti: true, farge: "#0065f1" }, stemmer: { prosent: 20.5, endring: { samme: -0.2 }, antall: { total: 574000, fhs: 0 } }, mandater: { antall: 36, endring: -1 } },
    { parti: { id: "FRP", navn: { nb: "Fremskrittspartiet", nn: "Framstegspartiet" }, kortNavn: "FRP", kategori: 1, isParti: true, farge: "#024a8f" }, stemmer: { prosent: 11.7, endring: { samme: 3.4 }, antall: { total: 327600, fhs: 0 } }, mandater: { antall: 21, endring: 6 } },
    { parti: { id: "SV", navn: { nb: "Sosialistisk Venstreparti", nn: "Sosialistisk Venstreparti" }, kortNavn: "SV", kategori: 1, isParti: true, farge: "#eb2e7b" }, stemmer: { prosent: 7.5, endring: { samme: 0.1 }, antall: { total: 210000, fhs: 0 } }, mandater: { antall: 13, endring: 0 } },
    { parti: { id: "SP", navn: { nb: "Senterpartiet", nn: "Senterpartiet" }, kortNavn: "SP", kategori: 1, isParti: true, farge: "#00843d" }, stemmer: { prosent: 12.4, endring: { samme: -1.7 }, antall: { total: 347200, fhs: 0 } }, mandater: { antall: 28, endring: -1 } },
    { parti: { id: "RØDT", navn: { nb: "Rødt", nn: "Raudt" }, kortNavn: "R", kategori: 1, isParti: true, farge: "#800000" }, stemmer: { prosent: 4.7, endring: { samme: 0.6 }, antall: { total: 131600, fhs: 0 } }, mandater: { antall: 8, endring: 0 } },
    { parti: { id: "V", navn: { nb: "Venstre", nn: "Venstre" }, kortNavn: "V", kategori: 1, isParti: true, farge: "#006666" }, stemmer: { prosent: 4.9, endring: { samme: 1.0 }, antall: { total: 137200, fhs: 0 } }, mandater: { antall: 8, endring: 0 } },
    { parti: { id: "MDG", navn: { nb: "Miljøpartiet De Grønne", nn: "Miljøpartiet Dei Grøne" }, kortNavn: "MDG", kategori: 1, isParti: true, farge: "#45c232" }, stemmer: { prosent: 3.2, endring: { samme: -0.7 }, antall: { total: 89600, fhs: 0 } }, mandater: { antall: 3, endring: -1 } },
    { parti: { id: "KRF", navn: { nb: "Kristelig Folkeparti", nn: "Kristeleg Folkeparti" }, kortNavn: "KRF", kategori: 1, isParti: true, farge: "#ffcb05" }, stemmer: { prosent: 3.8, endring: { samme: 0.1 }, antall: { total: 106400, fhs: 0 } }, mandater: { antall: 3, endring: -3 } },
    { parti: { id: "PASIENT", navn: { nb: "Pasientfokus", nn: "Pasientfokus" }, kortNavn: "PF", kategori: 2, isParti: true, farge: "#aaaaaa" }, stemmer: { prosent: 0.4, endring: { samme: 0.0 }, antall: { total: 11200, fhs: 0 } }, mandater: { antall: 1, endring: 1 } },
  ],
};

async function mockApi(page: Page) {
  await page.route(`${API_URL}**`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_RESPONSE) }),
  );
}

async function mockApiError(page: Page, status = 500) {
  await page.route(`${API_URL}**`, (route) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ error: "Server error" }) }),
  );
}

// ---------------------------------------------------------------------------
// Component loading
// ---------------------------------------------------------------------------

test.describe("Component loading", () => {
  logSuite("Component loading");

  test("shows loading state then renders party cards", async ({ page }) => {
    logSpec("shows loading state then renders party cards");
    logStep("Intercepting API with mock data");
    await mockApi(page);
    logStep("Navigating to /");
    await page.goto("/");

    logStep("Waiting for party cards A, H, SV");
    await expect(page.getByTestId("party-card-A")).toBeVisible();
    await expect(page.getByTestId("party-card-H")).toBeVisible();
    await expect(page.getByTestId("party-card-SV")).toBeVisible();
    logData("visible cards", "AP, H, SV");
    logPass("Party cards rendered after API response");
  });

  test("renders three block sections", async ({ page }) => {
    logSpec("renders three block sections");
    logStep("Intercepting API with mock data");
    await mockApi(page);
    await page.goto("/");

    logStep("Checking for block sections");
    await expect(page.getByTestId("block-left")).toBeVisible();
    await expect(page.getByTestId("block-neutral")).toBeVisible();
    await expect(page.getByTestId("block-right")).toBeVisible();
    logData("blocks", "left, neutral, right");
    logPass("All three block sections rendered");
  });

  test("displays block labels", async ({ page }) => {
    logSpec("displays block labels");
    await mockApi(page);
    await page.goto("/");

    logStep("Checking labels");
    await expect(page.getByTestId("block-left")).toBeVisible();
    await expect(page.getByText("Venstre")).toBeVisible();
    await expect(page.getByText("Nøytral")).toBeVisible();
    await expect(page.getByText("Høyre")).toBeVisible();
    logData("labels", "Venstre, Nøytral, Høyre");
    logPass("Block labels visible");
  });
});

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

test.describe("Header", () => {
  logSuite("Header");

  test("displays title", async ({ page }) => {
    logSpec("displays title");
    await mockApi(page);
    await page.goto("/");
    logStep("Checking heading element");
    await expect(page.getByRole("heading", { name: "Blokkbygger" })).toBeVisible();
    logPass("Title 'Blokkbygger' visible");
  });

  test("shows election statistics", async ({ page }) => {
    logSpec("shows election statistics in header");
    await mockApi(page);
    await page.goto("/");

    const header = page.locator("header");
    logStep("Checking Frammøte");
    await expect(header.getByText("78.2%")).toBeVisible();
    logStep("Checking Opptalt");
    await expect(header.getByText("95.4%")).toBeVisible();
    logStep("Checking Mandater");
    await expect(header.getByText("169", { exact: true })).toBeVisible();
    logStep("Checking Flertall");
    await expect(header.getByText("85", { exact: true })).toBeVisible();
    logData("stats", "78.2% | 95.4% | 169 | 85");
    logPass("All header stats visible");
  });

  test("shows last-updated timestamp", async ({ page }) => {
    logSpec("shows last-updated timestamp");
    await mockApi(page);
    await page.goto("/");
    logStep("Checking timestamp format");
    await expect(page.getByText(/Sist oppdatert.*10\. september 2025.*08:56/)).toBeVisible();
    logData("timestamp", "Sist oppdatert 10. september 2025 kl. 08:56");
    logPass("Timestamp format correct");
  });
});

// ---------------------------------------------------------------------------
// Default block distribution
// ---------------------------------------------------------------------------

test.describe("Default block distribution", () => {
  logSuite("Default block distribution");

  test("places left-wing parties in the Venstre block", async ({ page }) => {
    logSpec("left-wing parties → Venstre block");
    await mockApi(page);
    await page.goto("/");

    const leftBlock = page.getByTestId("block-left");
    logStep("Checking RØDT in Venstre"); await expect(leftBlock.getByTestId("party-card-RØDT")).toBeVisible();
    logStep("Checking SV in Venstre");   await expect(leftBlock.getByTestId("party-card-SV")).toBeVisible();
    logStep("Checking AP in Venstre");   await expect(leftBlock.getByTestId("party-card-A")).toBeVisible();
    logStep("Checking MDG in Venstre");  await expect(leftBlock.getByTestId("party-card-MDG")).toBeVisible();
    logData("Venstre parties", "RØDT, SV, AP, MDG");
    logPass("All left-wing parties placed in Venstre");
  });

  test("places right-wing parties in the Høyre block", async ({ page }) => {
    logSpec("right-wing parties → Høyre block");
    await mockApi(page);
    await page.goto("/");

    const rightBlock = page.getByTestId("block-right");
    logStep("Checking V in Høyre");   await expect(rightBlock.getByTestId("party-card-V")).toBeVisible();
    logStep("Checking H in Høyre");   await expect(rightBlock.getByTestId("party-card-H")).toBeVisible();
    logStep("Checking FRP in Høyre"); await expect(rightBlock.getByTestId("party-card-FRP")).toBeVisible();
    logStep("Checking KRF in Høyre"); await expect(rightBlock.getByTestId("party-card-KRF")).toBeVisible();
    logData("Høyre parties", "V, H, FRP, KRF");
    logPass("All right-wing parties placed in Høyre");
  });

  test("places remaining parties in the Nøytral block", async ({ page }) => {
    logSpec("remaining parties → Nøytral block");
    await mockApi(page);
    await page.goto("/");
    logStep("Checking SP in Nøytral");
    await expect(page.getByTestId("block-neutral").getByTestId("party-card-SP")).toBeVisible();
    logData("Nøytral parties", "SP");
    logPass("SP placed in Nøytral");
  });
});

// ---------------------------------------------------------------------------
// Mandate counters
// ---------------------------------------------------------------------------

test.describe("Mandate counters", () => {
  logSuite("Mandate counters");

  test("left block shows correct mandate sum", async ({ page }) => {
    logSpec("Venstre mandate counter");
    await mockApi(page);
    await page.goto("/");

    logStep("Expected: RØDT(8) + SV(13) + A(48) + MDG(3) = 72");
    const leftBlock = page.getByTestId("block-left");
    await expect(leftBlock.getByText("72")).toBeVisible();
    await expect(leftBlock.getByText(/\/ 169 mandater/)).toBeVisible();
    logData("Venstre", "72 / 169 mandater");
    logPass("Left block mandate sum correct");
  });

  test("right block shows correct mandate sum", async ({ page }) => {
    logSpec("Høyre mandate counter");
    await mockApi(page);
    await page.goto("/");

    logStep("Expected: V(8) + H(36) + FRP(21) + KRF(3) = 68");
    const rightBlock = page.getByTestId("block-right");
    await expect(rightBlock.getByText("68")).toBeVisible();
    await expect(rightBlock.getByText(/\/ 169 mandater/)).toBeVisible();
    logData("Høyre", "68 / 169 mandater");
    logPass("Right block mandate sum correct");
  });

  test("no block shows majority initially", async ({ page }) => {
    logSpec("no majority indicator initially");
    await mockApi(page);
    await page.goto("/");
    logStep("Neither 72 nor 68 >= 85 → no ✓ Flertall");
    await expect(page.getByText("Flertall").last()).toBeVisible();
    await expect(page.getByText("✓ Flertall")).toHaveCount(0);
    logData("threshold", "85 (ceil(169/2))");
    logData("majority indicators", "0");
    logPass("No block reaches majority threshold");
  });
});

// ---------------------------------------------------------------------------
// Party cards
// ---------------------------------------------------------------------------

test.describe("Party cards", () => {
  logSuite("Party cards");

  test("displays party name, mandates, and percentage", async ({ page }) => {
    logSpec("AP card content");
    await mockApi(page);
    await page.goto("/");

    const apCard = page.getByTestId("party-card-A");
    logStep("Checking card content");
    await expect(apCard).toBeVisible();
    await expect(apCard.getByText("AP")).toBeVisible();
    await expect(apCard.getByText("48 mandater")).toBeVisible();
    await expect(apCard.getByText("26.3%")).toBeVisible();
    logData("name", "AP");
    logData("mandates", "48 mandater");
    logData("percentage", "26.3%");
    logPass("AP card displays correct data");
  });

  test("party cards have correct accessibility attributes", async ({ page }) => {
    logSpec("AP card accessibility attributes");
    await mockApi(page);
    await page.goto("/");

    const apCard = page.getByTestId("party-card-A");
    logStep("Checking ARIA attributes");
    await expect(apCard).toHaveAttribute("role", "button");
    await expect(apCard).toHaveAttribute("aria-roledescription", "draggable party");
    await expect(apCard).toHaveAttribute("aria-label", /Arbeiderpartiet.*48 mandater/);
    logData("role", "button");
    logData("aria-roledescription", "draggable party");
    logData("aria-label", "Arbeiderpartiet, 48 mandater");
    logPass("Accessibility attributes correct");
  });
});

// ---------------------------------------------------------------------------
// Drag and drop
// ---------------------------------------------------------------------------

test.describe("Drag and drop", () => {
  logSuite("Drag and drop");

  test("moves a party from Nøytral to Venstre block", async ({ page }) => {
    logSpec("drag SP: Nøytral → Venstre");
    await mockApi(page);
    await page.goto("/");

    const spCard = page.getByTestId("party-card-SP");
    const leftBlock = page.getByTestId("block-left");

    logStep("Confirming SP starts in Nøytral");
    await expect(page.getByTestId("block-neutral").getByTestId("party-card-SP")).toBeVisible();

    const spBox = await spCard.boundingBox();
    const leftBox = await leftBlock.boundingBox();
    if (!spBox || !leftBox) throw new Error("Could not get bounding boxes");

    logStep(`Dragging from (${Math.round(spBox.x + spBox.width / 2)}, ${Math.round(spBox.y + spBox.height / 2)}) → (${Math.round(leftBox.x + leftBox.width / 2)}, ${Math.round(leftBox.y + leftBox.height / 2)})`);
    await page.mouse.move(spBox.x + spBox.width / 2, spBox.y + spBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(leftBox.x + leftBox.width / 2, leftBox.y + leftBox.height / 2, { steps: 20 });
    await page.mouse.up();

    logStep("Verifying SP is now in Venstre");
    await expect(leftBlock.getByTestId("party-card-SP")).toBeVisible({ timeout: 3000 });
    logData("result", "SP moved to Venstre block");
    logPass("Drag from Nøytral to Venstre succeeded");
  });

  test("moves a party from Venstre to Høyre block", async ({ page }) => {
    logSpec("drag MDG: Venstre → Høyre");
    await mockApi(page);
    await page.goto("/");

    const mdgCard = page.getByTestId("party-card-MDG");
    const rightBlock = page.getByTestId("block-right");

    logStep("Confirming MDG starts in Venstre");
    await expect(mdgCard).toBeVisible();

    const mdgBox = await mdgCard.boundingBox();
    const rightBox = await rightBlock.boundingBox();
    if (!mdgBox || !rightBox) throw new Error("Could not get bounding boxes");

    logStep(`Dragging from (${Math.round(mdgBox.x + mdgBox.width / 2)}, ${Math.round(mdgBox.y + mdgBox.height / 2)}) → (${Math.round(rightBox.x + rightBox.width / 2)}, ${Math.round(rightBox.y + rightBox.height / 2)})`);
    await page.mouse.move(mdgBox.x + mdgBox.width / 2, mdgBox.y + mdgBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(rightBox.x + rightBox.width / 2, rightBox.y + rightBox.height / 2, { steps: 20 });
    await page.mouse.up();

    logStep("Verifying MDG is now in Høyre");
    await expect(rightBlock.getByTestId("party-card-MDG")).toBeVisible({ timeout: 3000 });
    logData("result", "MDG moved to Høyre block");
    logPass("Drag from Venstre to Høyre succeeded");
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

test.describe("Error handling", () => {
  logSuite("Error handling");

  test("shows error banner when API returns 500", async ({ page }) => {
    logSpec("error banner on HTTP 500");
    logStep("Intercepting API → HTTP 500");
    await mockApiError(page, 500);
    await page.goto("/");

    logStep("Waiting for error banner");
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("Kunne ikke hente valgdata");
    logData("banner text", '"Kunne ikke hente valgdata"');
    logPass("Error banner visible on HTTP 500");
  });

  test("recovers when API starts returning data after failure", async ({ page }) => {
    logSpec("recovery after API failure");
    logStep("Intercepting API → HTTP 500 (initial)");
    await mockApiError(page, 500);
    await page.goto("/");

    logStep("Confirming error banner visible");
    await expect(page.getByRole("alert")).toBeVisible();
    logData("state before", "error banner visible, no party cards");

    logStep("Switching API to return 200 OK");
    await page.unroute(`${API_URL}**`);
    await mockApi(page);

    logStep("Waiting for next poll to succeed");
    await expect(page.getByTestId("party-card-A")).toBeVisible({ timeout: 35000 });
    await expect(page.getByRole("alert")).not.toBeVisible();
    logData("state after", "AP visible, error banner gone");
    logPass("Recovery: error cleared, data rendered");
  });

  test("keeps data visible when API fails after initial success", async ({ page }) => {
    logSpec("graceful degradation on poll failure");
    logStep("Intercepting API → 200 OK (initial success)");
    await mockApi(page);
    await page.goto("/");

    logStep("Waiting for initial data");
    await expect(page.getByTestId("party-card-A")).toBeVisible();
    logData("state before failure", "AP, H visible — no error");

    logStep("Switching API to return HTTP 503");
    await page.unroute(`${API_URL}**`);
    await mockApiError(page, 503);

    logStep("Waiting for error banner on next poll");
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 35000 });

    logStep("Verifying data persisted");
    await expect(page.getByTestId("party-card-A")).toBeVisible();
    await expect(page.getByTestId("party-card-H")).toBeVisible();
    logData("state after failure", "error banner + AP + H all visible");
    logPass("Graceful degradation: data persists alongside error");
  });
});
