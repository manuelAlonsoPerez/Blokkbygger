# Blokkbygger

An embeddable React component for visualizing Norwegian parliamentary election coalitions. Users drag political parties into **Left**, **Neutral**, and **Right** blocks to explore government alternatives, powered by live data from NRK's election API.

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
- **TypeScript 5.7+**
- **@dnd-kit/core**, **@dnd-kit/sortable**, **@dnd-kit/utilities** (drag and drop)
- **clsx** (conditional class names)
- **Vite 6** (build tool)
- **Playwright** and **Vitest** (testing)

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

Produces the distributable bundle in `dist/`:

```
dist/
├── blokkbygger.es.js     # ESM module (for modern bundlers / host systems)
├── blokkbygger.umd.js    # UMD module (for <script> tags or require())
├── blokkbygger.css        # All component styles (CSS Modules, scoped)
└── index.d.ts             # TypeScript type declarations
```

**React is not included in the bundle** — it is listed as a `peerDependency`. The host system must provide React 18 or 19.

### Preview the production build

```bash
npm run preview
```

Serves the built output locally to verify the production bundle works correctly.

---

## Testing

### Run end-to-end tests (Playwright)

```bash
# Run all E2E tests (headless)
npx playwright test

# Run with browser visible
npx playwright test --headed

# Run a specific test file
npx playwright test tests/e2e/blokkbygger.spec.ts

# Open the interactive UI mode
npx playwright test --ui
```

### Run unit tests (Vitest)

```bash
# Run once
npx vitest run

# Watch mode (re-runs on file changes)
npx vitest
```

### View test reports

```bash
# Playwright HTML report (opens in browser)
npx playwright show-report

# Vitest coverage (if configured)
npx vitest run --coverage
```

---

## Usage in a Host System

The component exports a framework-agnostic `mount` / `unmount` API:

```typescript
import { mount } from "@nrk/blokkbygger"
import "@nrk/blokkbygger/style.css"

const container = document.getElementById("graphic-slot")

const instance = mount(container, {
  apiUrl: "https://valg.nrk.no/api/2025/st",
  pollIntervalMs: 30_000,
  majorityThreshold: 85,
  onBlockChange: (state) => {
    console.log("Blocks updated:", state)
  },
})

// Update config at runtime
instance.update({ pollIntervalMs: 10_000 })

// Read current state
const currentBlocks = instance.getState()

// Tear down (stops polling, removes DOM)
instance.unmount()
```

### Theming

Override CSS custom properties from the host:

```css
#graphic-slot {
  --bb-font-family: "NRK Sans", system-ui;
  --bb-text-color: #ffffff;
  --bb-card-bg: #2a2a2a;
  --bb-border-color: #444;
  --bb-accent: #ff6600;
  --bb-majority-color: #00ff88;
}
```

---

## Project Structure

```
src/
├── index.ts                    # Library entry point (exports mount, types)
├── mount.ts                    # mount/unmount/update implementation
├── api/
│   └── electionApi.ts          # Fetch + transform logic
├── components/
│   ├── Blokkbygger.tsx         # Root component
│   ├── Block.tsx               # Droppable zone
│   ├── PartyCard.tsx           # Draggable party card
│   ├── MandateCounter.tsx      # Mandate total display
│   ├── Header.tsx              # Timestamp display
│   ├── ErrorBanner.tsx
│   └── *.module.css            # Scoped styles per component
├── hooks/
│   ├── useElectionData.ts      # API polling (config-driven)
│   └── useBlockState.ts        # Block assignment state
├── types/
│   ├── api.ts                  # NRK API response types
│   └── domain.ts               # App domain types
└── utils/
    ├── transformApiData.ts
    ├── sumMandates.ts
    └── formatTime.ts

dev/
└── main.tsx                    # Dev harness (not included in build)

tests/
├── e2e/                        # Playwright tests
├── fixtures/                   # Mock API data
└── playwright.config.ts
```

---

## Scripts Reference

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Build library (ESM + UMD + CSS) |
| `npm run preview` | Preview production build locally |
| `npx tsc --noEmit` | Type-check without emitting files |
| `npx playwright test` | Run E2E tests |
| `npx vitest` | Run unit tests (watch mode) |
| `npx vitest run` | Run unit tests (single run) |
