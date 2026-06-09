# Blokkbygger

An embeddable React component for visualizing Norwegian parliamentary election coalitions. Users drag political parties into **Venstre** (left), **Nøytral**, and **Høyre** (right) blocks to explore government alternatives, powered by live data from NRK's election API.

Built as a library — designed to be mounted into a host build system, not run as a standalone app.

---

## Prerequisites

### Node.js

Install Node.js **v20 LTS** or later.

**macOS** (Homebrew):

```bash
brew install node
```

**Or use a version manager** (recommended if you work across projects):

```bash
# Install fnm (Fast Node Manager)
brew install fnm

# Install and use Node 20
fnm install 20
fnm use 20
```

**Verify installation:**

```bash
node --version   # v20.x.x or later
npm --version    # 10.x.x or later
```

### Git

```bash
# macOS (usually pre-installed, or via Homebrew)
brew install git

git --version    # 2.x.x
```

---

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd blokkbygger
```

### 2. Install dependencies

```bash
npm install
```

This installs all runtime and development dependencies, including:

- **React 19** and **ReactDOM** (dev/peer — the host provides these in production)
- **TypeScript 5.8+**
- **@dnd-kit/core**, **@dnd-kit/sortable**, **@dnd-kit/utilities** (drag and drop)
- **clsx** (conditional class names)
- **Vite 6** (build tool)
- **Vitest 3** + **@testing-library/react** + **jsdom** (unit and integration tests)
- **Playwright** (end-to-end browser tests)

### 3. Install Playwright browsers

Required once after cloning (downloads Chromium, Firefox, and WebKit):

```bash
npx playwright install
```

---

## Development

### Run the dev server

```bash
npm run dev
```

Opens a local dev harness at `http://localhost:5173` where the component is mounted into a test container. Hot module replacement (HMR) is enabled — changes appear instantly.

The dev harness (`dev/main.tsx`) renders the component with default settings and logs block state changes to the console.

### Type checking

```bash
npx tsc --noEmit
```

Runs the TypeScript compiler in check-only mode (no output files).

---

## Building

### Build the library

```bash
npm run build
```

Runs type checking, then produces the distributable bundle in `dist/`:

```
dist/
├── blokkbygger.es.js     # ESM module (for modern bundlers / host systems)
├── blokkbygger.umd.js    # UMD module (for <script> tags or require())
├── blokkbygger.css       # All component styles (CSS Modules, scoped)
└── index.d.ts            # TypeScript type declarations
```

**React is not included in the bundle** — it is listed as a `peerDependency`. The host system must provide React 18 or 19.

### Preview the production build

```bash
npm run preview
```

Serves the built output locally to verify the production bundle works correctly.

---

## Testing

### Run unit and integration tests (Vitest)

```bash
# Run all tests once
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# Run a specific test file
npx vitest run tests/utils/transformApiData.test.ts
```

The test suite covers three areas:

| File | What it tests |
|---|---|
| `tests/utils/transformApiData.test.ts` | Data transformation — category filtering, Andre aggregation, NaN guards, rounding |
| `tests/hooks/useElectionData.test.ts` | API hook — fetch on mount, metadata extraction, HTTP/network errors, data preservation on failure, error recovery, polling interval, unmount cleanup |
| `tests/components/ErrorHandling.test.tsx` | UI integration — loading state, party card rendering, ErrorBanner on API failure, graceful degradation (data persists while error shows), banner removal on recovery, header stats |

### Run end-to-end tests (Playwright)

```bash
# Run all E2E tests (headless, Chromium)
npm run test:e2e

# Run with browser visible
npx playwright test --headed

# Open the interactive UI mode
npm run test:e2e:ui
```

The E2E suite uses Playwright's route interception to mock the NRK API for deterministic results:

| Describe block | What it tests |
|---|---|
| `tests/e2e/blokkbygger.spec.ts` — Component loading | Party cards render, three block sections visible, block labels displayed |
| Header | Title, election stats (Frammøte, Opptalt, Mandater, Flertall), timestamp format |
| Default block distribution | Left-wing parties in Venstre, right-wing in Høyre, remaining in Nøytral |
| Mandate counters | Block mandate sums (72, 68), `/169 mandater` display, no majority initially |
| Party cards | Card content (name, mandates, percentage), ARIA accessibility attributes |
| Drag and drop | Move SP from Nøytral → Venstre, move MDG from Venstre → Høyre (real mouse drag) |
| Error handling | Error banner on HTTP 500, recovery after failure, graceful degradation (data persists alongside error) |

### View test reports

```bash
# Playwright HTML report (opens in browser)
npx playwright show-report

# Vitest coverage (if configured)
npx vitest run --coverage
```

### Test output

All tests include colored console output with structured logging:

- **` SUITE `** — marks each test suite
- **` TEST `** — names each spec
- **`→`** — describes each step
- **`↳`** — shows inspected data values
- **` PASS `** — confirms the result

---

## Usage in a Host System

The component exports a framework-agnostic `mount` / `unmount` API:

```typescript
import { mount } from "@nrk/blokkbygger";
import "@nrk/blokkbygger/style.css";

const container = document.getElementById("graphic-slot");

const instance = mount(container, {
  apiUrl: "https://valg.nrk.no/api/2025/st",
  pollIntervalMs: 30_000,
  onBlockChange: (state) => {
    console.log("Blocks updated:", state);
  },
});

// Update config at runtime
instance.update({ pollIntervalMs: 10_000 });

// Read current state
const currentBlocks = instance.getState();

// Tear down (stops polling, removes DOM)
instance.unmount();
```

### Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `apiUrl` | `string` | `"https://valg.nrk.no/api/2025/st"` | NRK election API endpoint |
| `pollIntervalMs` | `number` | `30000` | Polling interval in milliseconds |
| `majorityThreshold` | `number` | `Math.ceil(totalMandates / 2)` | Override the auto-calculated majority threshold |
| `initialBlocks` | `BlockState` | Predefined blocs | Override the default party-to-block distribution |
| `locale` | `"nb" \| "nn"` | `"nb"` | Norwegian language variant |
| `onBlockChange` | `(state: BlockState) => void` | — | Callback when a party is moved between blocks |

**Default bloc distribution** (when no `initialBlocks` is provided):

| Block | Parties |
|---|---|
| **Venstre** | Rødt, SV, Arbeiderpartiet, MDG |
| **Høyre** | Venstre, Høyre, Fremskrittspartiet, Kristelig Folkeparti |
| **Nøytral** | Senterpartiet, Andre, and any other party |

**Dynamic majority**: The majority threshold is calculated from the API's `mandater.antall` field using `Math.ceil(totalMandates / 2)`. For the 2025 Storting election (169 seats), this yields 85. You can override it with the `majorityThreshold` option.

### Theming

Override CSS custom properties from the host. All variables are prefixed with `--bb-`:

```css
#graphic-slot {
  --bb-font-family: "NRK Sans Variable", system-ui;
  --bb-bg: #141517;
  --bb-text-color: #ffffff;
  --bb-header-bg: #1a1a2e;
  --bb-card-bg: #2a2a2a;
  --bb-card-border: #444;
  --bb-accent: #ff6600;
  --bb-majority-color: #00ff88;
}
```

The full list of CSS custom properties is documented in `HIGH_ORDER_FUNCTIONALITY.md` (Section 7).

---

## Project Structure

```
src/
├── index.ts                           # Library entry point (exports mount + types)
├── mount.ts                           # mount/unmount/update API implementation
├── config.ts                          # Centralized constants (API URL, defaults, party IDs)
├── components/
│   └── Blokkbygger/
│       ├── index.ts                   # Barrel export
│       ├── Blokkbygger.tsx            # Root component — hooks, DnD, layout
│       ├── Blokkbygger.module.css
│       ├── Block.tsx                  # Droppable zone (Venstre/Nøytral/Høyre)
│       ├── Block.module.css
│       ├── PartyCard.tsx              # Draggable party card
│       ├── PartyCard.module.css
│       ├── MandateCounter.tsx         # Block mandate total (e.g. "79 / 169")
│       ├── MandateCounter.module.css
│       ├── Header.tsx                 # Title, election stats, timestamp
│       ├── Header.module.css
│       ├── ErrorBanner.tsx            # Conditional API error alert
│       └── ErrorBanner.module.css
├── hooks/
│   ├── useElectionData.ts             # API fetch + poll + transform
│   └── useBlockState.ts               # Block assignment state + defaults
├── types/
│   ├── api.ts                         # NRK API response interfaces
│   └── domain.ts                      # App domain types (Party, BlockState, etc.)
└── utils/
    ├── transformApiData.ts            # API → Party[] transformation
    ├── sumMandates.ts                 # Sum mandates for a set of party IDs
    └── formatTime.ts                  # ISO → "10. september 2025 kl. 08:56"

dev/
└── main.tsx                           # Dev harness (not included in build)

tests/
├── setup.ts                           # Vitest setup (jest-dom matchers)
├── fixtures/
│   └── electionData.ts                # Mock API responses (success, empty, null %)
├── utils/
│   ├── testLogger.ts                  # Colored console logger (SUITE/TEST/STEP/PASS)
│   └── transformApiData.test.ts       # Data transformation unit tests (7 tests)
├── hooks/
│   └── useElectionData.test.ts        # API hook unit tests (14 tests)
├── components/
│   └── ErrorHandling.test.tsx         # UI integration tests (9 tests)
└── e2e/
    └── blokkbygger.spec.ts            # Playwright E2E tests (19 tests)

vitest.config.ts                       # Vitest config (jsdom, CSS modules, excludes e2e)
playwright.config.ts                   # Playwright config (Chromium, auto dev server)
```

---

## Scripts Reference

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Type-check + build library (ESM + UMD + CSS) |
| `npm run preview` | Preview production build locally |
| `npm test` | Run unit tests (single run) |
| `npm run test:watch` | Run unit tests (watch mode) |
| `npm run test:e2e` | Run Playwright E2E tests (Chromium) |
| `npm run test:e2e:ui` | Run Playwright E2E tests (interactive UI) |
| `npx tsc --noEmit` | Type-check without emitting files |

---

## Test Summary

| Layer | File | Tests | What it covers |
|---|---|---|---|
| Unit | `transformApiData.test.ts` | 7 | Category filtering, Andre aggregation, NaN guards, rounding, order |
| Unit | `useElectionData.test.ts` | 14 | Fetch, metadata, HTTP/network errors, data preservation, recovery, polling, cleanup |
| Integration | `ErrorHandling.test.tsx` | 9 | Loading, rendering, ErrorBanner, graceful degradation, recovery, header stats |
| E2E | `blokkbygger.spec.ts` | 19 | Full browser: loading, blocks, drag-and-drop, mandate counters, accessibility, errors |
| **Total** | | **49** | |
