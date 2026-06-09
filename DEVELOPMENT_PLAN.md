# Blokkbygger – Development Plan

## Overview

**Blokkbygger** is a client-side component for the Norwegian parliamentary election (Stortingsvalget). It lets users visualize government coalition alternatives by dragging political parties into three blocks: **Left (Venstre)**, **Neutral**, and **Right (Høyre)**. The component fetches live election results from NRK's API and updates every 30 seconds.

A majority government requires **at least 85 mandates** (of 169 total seats in Stortinget).

---

## Embeddability: Designing for a Host Build System

This component is intended for NRK's **Grafisk Utvikling** pipeline — a custom build system where graphics components are imported into a visual composition tool (similar to slides in a presentation). This fundamentally shapes every architectural decision.

### Constraints of an Embeddable System

| Concern | Standalone SPA | Embeddable Component |
|---|---|---|
| Entry point | `ReactDOM.createRoot(#root)` | Exported `mount(container, config)` / `unmount()` functions |
| CSS | Global (Tailwind utilities everywhere) | Scoped — must not leak into or be affected by the host |
| React | Bundled | Peer dependency — host provides it |
| Configuration | Hardcoded constants | Injected via props/config at mount time |
| Lifecycle | Page load → page unload | `mount()` → `update()` → `unmount()`, controlled by host |
| Bundle format | HTML + JS chunks | ESM library export (+ optional UMD fallback) |
| Multiple instances | Not considered | Must support N instances on the same page |
| Sizing | Controls its own viewport | Must fill whatever container the host provides |

### Public API Surface

The component exposes a minimal, framework-agnostic API that the host system calls:

```typescript
// blokkbygger.ts — the library entry point

export interface BlokkbyggerConfig {
  apiUrl?: string             // default: "https://valg.nrk.no/api/2025/st"
  pollIntervalMs?: number     // default: 30_000
  initialBlocks?: BlockState  // optional pre-configured block assignments
  majorityThreshold?: number  // default: 85
  locale?: "nb" | "nn"        // default: "nb"
  onBlockChange?: (state: BlockState) => void  // callback when user moves a party
}

export function mount(
  container: HTMLElement,
  config?: BlokkbyggerConfig
): BlokkbyggerInstance

export interface BlokkbyggerInstance {
  update(config: Partial<BlokkbyggerConfig>): void  // host can push new config
  getState(): BlockState                             // read current block state
  unmount(): void                                    // clean teardown
}
```

**Why this matters:**
- The host system can create the component with `mount(div, { apiUrl, pollIntervalMs })` and tear it down with `instance.unmount()` — no React knowledge required.
- `onBlockChange` lets the host react to user interactions (e.g., sync state to a control room dashboard).
- `update()` allows the host to change config at runtime (e.g., switch API URL mid-broadcast).
- `getState()` lets the host serialize/restore block assignments across "slides".

### Implementation of `mount` / `unmount`

```typescript
// pseudocode: src/mount.ts
import { createRoot } from "react-dom/client"
import { Blokkbygger } from "./components/Blokkbygger"

export function mount(container, config = {}) {
  const root = createRoot(container)
  let currentConfig = { ...defaults, ...config }

  function render() {
    root.render(<Blokkbygger {...currentConfig} />)
  }

  render()

  return {
    update(newConfig) {
      currentConfig = { ...currentConfig, ...newConfig }
      render()
    },
    getState() {
      // reads from a shared ref inside the component tree
      return stateRef.current
    },
    unmount() {
      root.unmount()
    },
  }
}
```

### CSS Isolation Strategy

**Problem**: Tailwind generates global utility classes (`p-4`, `text-xl`, etc.) that will collide with the host's styles or other embedded components.

**Solution**: Replace Tailwind with **CSS Modules** (built into Vite, zero config).

| Approach | Isolation | Trade-off |
|---|---|---|
| Tailwind (global) | None | Breaks in host systems |
| CSS Modules | Per-component scoped | Slightly more verbose, but zero leakage |
| Shadow DOM | Full encapsulation | Breaks `@dnd-kit` portals; overkill here |
| Tailwind + `prefix` + `important: selector` | Partial | Fragile, verbose class names |

CSS Modules generate unique class names at build time (e.g., `_block_1a2b3`) — they cannot collide with the host.

```css
/* Block.module.css */
.container {
  display: grid;
  min-height: 300px;
  border: 2px solid var(--bb-border-color, #e5e7eb);
  border-radius: 8px;
  padding: 1rem;
  transition: border-color 0.15s;
}

.container[data-is-over="true"] {
  border-color: var(--bb-accent, #60a5fa);
  background: var(--bb-drop-bg, #eff6ff);
}

.hasMajority {
  box-shadow: 0 0 0 2px var(--bb-majority-color, #22c55e);
}
```

```tsx
import styles from "./Block.module.css"
import clsx from "clsx"

function Block({ isOver, hasMajority, children }) {
  return (
    <section
      className={clsx(styles.container, hasMajority && styles.hasMajority)}
      data-is-over={isOver}
    >
      {children}
    </section>
  )
}
```

**CSS Custom Properties** (`--bb-*` prefix) allow the host to theme the component without touching its internals:

```css
/* Host system can override in its own stylesheet */
.graphics-slide {
  --bb-border-color: #333;
  --bb-accent: #ff6600;
  --bb-majority-color: #00ff88;
  --bb-font-family: "NRK Sans", system-ui;
}
```

### Vite Library Mode Build

```typescript
// vite.config.ts
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: "src/index.ts",              // exports mount/unmount
      name: "Blokkbygger",                // global name for UMD
      formats: ["es", "umd"],             // ESM for modern hosts, UMD as fallback
      fileName: (format) => `blokkbygger.${format}.js`,
    },
    rollupOptions: {
      external: ["react", "react-dom"],   // host provides these
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
    cssCodeSplit: false,                   // single CSS file, easy for host to load
  },
})
```

**Output:**
```
dist/
├── blokkbygger.es.js       # ESM — import { mount } from "./blokkbygger.es.js"
├── blokkbygger.umd.js      # UMD — <script src="..."> or require()
└── blokkbygger.css          # all scoped styles in one file
```

The host imports like:

```typescript
// In the host's "slide" / "graphic" definition
import { mount } from "@nrk/blokkbygger"

const container = document.getElementById("graphic-slot-3")
const instance = mount(container, {
  apiUrl: "https://valg.nrk.no/api/2025/st",
  pollIntervalMs: 30_000,
  onBlockChange: (state) => controlRoom.broadcast("blokkbygger:update", state),
})

// Later, when the host removes this "slide":
instance.unmount()
```

---

## Architecture

```
  HOST BUILD SYSTEM (graphics compositor)
  ┌─────────────────────────────────────────────────────────────────┐
  │                                                                 │
  │   mount(container, config)          instance.unmount()          │
  │        │                                  │                     │
  │        ▼                                  ▼                     │
  │   ┌────────────────────────────────────────────────────────┐    │
  │   │  <Blokkbygger>  (scoped root — no global side effects) │    │
  │   │                                                        │    │
  │   │  ┌──────────────────────────────────────────────────┐  │    │
  │   │  │         useElectionData(apiUrl, interval)        │  │    │
  │   │  │   fetch → transform → poll (cleanup on unmount)  │  │    │
  │   │  └──────────────────────────────────────────────────┘  │    │
  │   │                                                        │    │
  │   │  ┌────────────┐ ┌────────────┐ ┌────────────────┐     │    │
  │   │  │  Block     │ │  Block     │ │  Block         │     │    │
  │   │  │  "Venstre" │ │  "Nøytral" │ │  "Høyre"       │     │    │
  │   │  │  ┌──────┐  │ │  ┌──────┐  │ │  ┌──────────┐  │     │    │
  │   │  │  │Party │  │ │  │Party │  │ │  │  Party   │  │     │    │
  │   │  │  │Card  │  │ │  │Card  │  │ │  │  Card    │  │     │    │
  │   │  │  └──────┘  │ │  └──────┘  │ │  └──────────┘  │     │    │
  │   │  │  Sum: 71   │ │            │ │  Sum: 71       │     │    │
  │   │  └────────────┘ └────────────┘ └────────────────┘     │    │
  │   │                                                        │    │
  │   │  onBlockChange(state) ──────────────────► host callback│    │
  │   └────────────────────────────────────────────────────────┘    │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Core

| Library | Version | Purpose |
|---|---|---|
| **React** | ^19 | UI framework — **peer dependency** (host provides it) |
| **TypeScript** | ^5.7 | Type safety |
| **Vite** | ^6 | Build tool in **library mode**, dev server for development |

### Drag & Drop

| Library | Version | Purpose |
|---|---|---|
| **@dnd-kit/core** | ^6 | Lightweight, accessible drag-and-drop primitives for React. Chosen over `react-beautiful-dnd` (deprecated) and native HTML DnD (poor mobile/accessibility support). |
| **@dnd-kit/sortable** | ^10 | Sortable preset for reordering within blocks |
| **@dnd-kit/utilities** | ^3 | CSS transform utilities |

### Styling

| Library | Version | Purpose |
|---|---|---|
| **CSS Modules** | (built into Vite) | Scoped, collision-free class names — safe for embedding in any host. No extra dependency needed. |
| **CSS Custom Properties** | (native CSS) | `--bb-*` variables let the host theme the component externally. |

### Testing

| Library | Version | Purpose |
|---|---|---|
| **Playwright** | ^1.52 | End-to-end testing, cross-browser |
| **@playwright/test** | ^1.52 | Test runner with assertions, fixtures |
| **Vitest** | ^3 | Unit testing for hooks/utilities |

### Utilities

| Library | Version | Purpose |
|---|---|---|
| **clsx** | ^2 | Conditional className composition |

### Why these choices?

- **Vite library mode** over a standard SPA build: Outputs ESM + UMD bundles with React externalized. The host loads one JS file and one CSS file — no HTML shell, no global side effects.
- **CSS Modules** over Tailwind: Tailwind generates global utility classes (`p-4`, `text-xl`) that leak into and collide with the host system. CSS Modules generate unique hashed class names at build time (e.g., `_block_1a2b3`), providing complete style isolation with zero runtime cost. CSS Custom Properties (`--bb-*`) provide a clean theming API for the host.
- **@dnd-kit** over react-beautiful-dnd: The latter is unmaintained. dnd-kit is actively maintained, tree-shakeable (important for library size), has first-class accessibility (keyboard navigation, screen readers), and supports touch/pointer events natively.
- **React as peer dependency**: The host system likely already provides React. Bundling it again would double the bundle size and risk version conflicts (hooks break if two React instances coexist).
- **Vitest** for unit tests alongside Playwright for E2E — fast feedback loop for logic, comprehensive coverage for user flows.

---

## TypeScript Types

```typescript
// ---------- API Response Types ----------

interface ElectionResponse {
  resultatType: string;
  tidspunkt: {
    rapportGenerert: string;
    sisteStemmer: string;
  };
  valg: { year: number; type: string };
  geografi: {
    key: string;
    navn: { nb: string; sme: string };
    type: string;
    stemmeberettigede: number;
  };
  mandater: { antall: number; endring: number };
  antallStemmer: number;
  opptaltProsent: number;
  partier: ApiParty[];
}

interface ApiParty {
  parti: {
    id: string;
    navn: { nb: string; nn: string };
    kortNavn: string;
    kategori: number;
    farge: string;
  };
  stemmer: {
    prosent: number;
    endring: { samme: number };
    antall: { total: number; fhs: number };
  };
  mandater: {
    antall: number;
    endring: number;
  };
}

// ---------- Application Domain Types ----------

interface Party {
  id: string;            // e.g. "AP", "H", "andre"
  name: string;          // e.g. "Arbeider­partiet", "An."
  shortName: string;     // e.g. "AP", "An."
  mandates: number;      // current mandate count
  percentage: number;    // vote percentage
  color: string;         // party color from API
}

type BlockId = "left" | "neutral" | "right";

interface BlockState {
  left: string[];       // array of Party IDs
  neutral: string[];
  right: string[];
}

interface Block {
  id: BlockId;
  label: string;        // "Venstre", "Nøytral", "Høyre"
  partyIds: string[];
  totalMandates: number;
}
```

---

## Data Transformation

The API returns all parties, but the app must:

1. **Filter**: Keep only `kategori === 1` as individual parties.
2. **Aggregate**: Sum mandates of all `kategori !== 1` into a synthetic `"An."` party.
3. **Preserve party identity** across polling updates so drag state isn't lost.

```typescript
// pseudocode: transformApiData(response: ElectionResponse): Party[]
function transformApiData(response) {
  const parties = []
  let andreMandater = 0
  let andreProsent = 0

  for each apiParty in response.partier {
    if apiParty.parti.kategori === 1 {
      parties.push({
        id: apiParty.parti.id,
        name: apiParty.parti.navn.nb,
        shortName: apiParty.parti.kortNavn,
        mandates: apiParty.mandater.antall,
        percentage: apiParty.stemmer.prosent,
        color: apiParty.parti.farge,
      })
    } else {
      andreMandater += apiParty.mandater.antall
      andreProsent += apiParty.stemmer.prosent
    }
  }

  parties.push({
    id: "andre",
    name: "An.",
    shortName: "An.",
    mandates: andreMandater,
    percentage: round(andreProsent, 1),
    color: "#999999",
  })

  return parties
}
```

---

## Component Breakdown (Pseudocode)

All components use **CSS Modules** for style isolation. Class names shown below (e.g., `styles.container`) reference `*.module.css` files with component-scoped selectors. CSS Custom Properties prefixed `--bb-*` allow the host system to theme the component externally.

### 1. `<Blokkbygger />` (Root)

The root component. **Not called `App`** — it receives config as props from the `mount()` function, not from a global context.

```tsx
interface BlokkbyggerProps {
  apiUrl: string
  pollIntervalMs: number
  initialBlocks?: BlockState
  majorityThreshold: number
  locale: "nb" | "nn"
  onBlockChange?: (state: BlockState) => void
}

function Blokkbygger(props: BlokkbyggerProps) {
  const { apiUrl, pollIntervalMs, majorityThreshold, onBlockChange } = props

  // Config-driven polling — host controls the URL and interval
  const { parties, lastUpdated, isLoading, error } =
    useElectionData(apiUrl, pollIntervalMs)

  const { blocks, moveParty } = useBlockState(parties, props.initialBlocks)

  // Notify host whenever block state changes
  useEffect(() => {
    onBlockChange?.(blocks)
  }, [blocks, onBlockChange])

  const leftTotal = sumMandates(blocks.left, parties)
  const rightTotal = sumMandates(blocks.right, parties)

  return (
    <div className={styles.root}>
      <DndContext onDragEnd={handleDragEnd}>
        <Header lastUpdated={lastUpdated} />
        <div className={styles.grid}>
          <Block
            id="left"
            label="Venstre"
            partyIds={blocks.left}
            parties={parties}
            totalMandates={leftTotal}
            hasMajority={leftTotal >= majorityThreshold}
          />
          <Block
            id="neutral"
            label="Nøytral"
            partyIds={blocks.neutral}
            parties={parties}
          />
          <Block
            id="right"
            label="Høyre"
            partyIds={blocks.right}
            parties={parties}
            totalMandates={rightTotal}
            hasMajority={rightTotal >= majorityThreshold}
          />
        </div>
        {error && <ErrorBanner message={error} />}
      </DndContext>
    </div>
  )

  function handleDragEnd(event) {
    const { active, over } = event
    if over exists {
      moveParty(active.id, over.id as BlockId)
    }
  }
}
```

```css
/* Blokkbygger.module.css */
.root {
  font-family: var(--bb-font-family, system-ui, sans-serif);
  color: var(--bb-text-color, #1a1a1a);
  width: 100%;       /* fills whatever container the host provides */
  height: 100%;
  box-sizing: border-box;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1rem;
}
```

### 2. `<Block />`

A droppable zone representing one political block.

```tsx
interface BlockProps {
  id: BlockId
  label: string
  partyIds: string[]
  parties: Party[]
  totalMandates?: number
  hasMajority?: boolean
}

function Block({ id, label, partyIds, parties, totalMandates, hasMajority }) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <section
      ref={setNodeRef}
      className={clsx(
        styles.container,
        isOver && styles.dropTarget,
        hasMajority && styles.hasMajority
      )}
      data-testid={`block-${id}`}
      aria-label={`${label}-blokken`}
    >
      <h2 className={styles.title}>{label}</h2>

      <SortableContext items={partyIds}>
        {partyIds.map(partyId => {
          const party = parties.find(p => p.id === partyId)
          return <PartyCard key={partyId} party={party} />
        })}
      </SortableContext>

      {totalMandates !== undefined && (
        <MandateCounter total={totalMandates} hasMajority={hasMajority} />
      )}
    </section>
  )
}
```

```css
/* Block.module.css */
.container {
  min-height: 300px;
  border: 2px solid var(--bb-border-color, #e5e7eb);
  border-radius: 8px;
  padding: 1rem;
  transition: border-color 0.15s, background-color 0.15s;
}

.dropTarget {
  border-color: var(--bb-accent, #60a5fa);
  background: var(--bb-drop-bg, #eff6ff);
}

.hasMajority {
  box-shadow: 0 0 0 2px var(--bb-majority-color, #22c55e);
}

.title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}
```

### 3. `<PartyCard />`

A draggable card displaying one party.

```tsx
interface PartyCardProps {
  party: Party
}

function PartyCard({ party }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({ id: party.id })

  const style = { transform: CSS.Transform.toString(transform) }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={clsx(styles.card, isDragging && styles.dragging)}
      data-testid={`party-card-${party.id}`}
      role="button"
      aria-roledescription="draggable party"
      aria-label={`${party.name}, ${party.mandates} mandater`}
    >
      <span className={styles.dot} style={{ backgroundColor: party.color }} />
      <span className={styles.name}>{party.shortName}</span>
      <span className={styles.mandates}>{party.mandates} mandater</span>
      <span className={styles.percent}>{party.percentage}%</span>
    </div>
  )
}
```

```css
/* PartyCard.module.css */
.card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 6px;
  border: 1px solid var(--bb-card-border, #e5e7eb);
  background: var(--bb-card-bg, #fff);
  cursor: grab;
  transition: box-shadow 0.15s;
}

.card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.dragging  { opacity: 0.5; box-shadow: 0 4px 16px rgba(0,0,0,0.12); }

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.name     { font-weight: 600; flex: 1; }
.mandates { font-size: 0.875rem; color: var(--bb-text-secondary, #6b7280); }
.percent  { font-size: 0.75rem; color: var(--bb-text-tertiary, #9ca3af); }
```

### 4. `<MandateCounter />`

Displays mandate sum for a block and indicates majority status.

```tsx
function MandateCounter({ total, hasMajority }) {
  return (
    <div className={clsx(
      styles.counter,
      hasMajority ? styles.majority : styles.noMajority
    )}>
      {total} / 85 mandater
      {hasMajority && <span className={styles.check}>Flertall</span>}
    </div>
  )
}
```

### 5. `<Header />`

Shows last-updated timestamp. No hardcoded title — the host system provides its own chrome.

```tsx
function Header({ lastUpdated }) {
  return (
    <header className={styles.header}>
      <p className={styles.timestamp}>
        Sist oppdatert: {formatTime(lastUpdated)}
      </p>
    </header>
  )
}
```

---

## Custom Hooks

### `useElectionData`

Fetches and polls the NRK election API. **Both the URL and the interval are parameters** — the host controls them via config.

```typescript
function useElectionData(apiUrl: string, pollIntervalMs: number) {
  const [parties, setParties] = useState<Party[]>([])
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchData() {
    try {
      const response = await fetch(apiUrl)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data: ElectionResponse = await response.json()

      const transformed = transformApiData(data)
      setParties(transformed)
      setLastUpdated(data.tidspunkt.rapportGenerert)
      setError(null)
    } catch (err) {
      setError("Kunne ikke hente valgdata. Prøver igjen...")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, pollIntervalMs)
    return () => clearInterval(interval)   // critical: cleanup on unmount
  }, [apiUrl, pollIntervalMs])

  return { parties, lastUpdated, isLoading, error }
}
```

**Key considerations:**
- The `useEffect` cleanup (`clearInterval`) is essential in an embeddable context — when the host calls `instance.unmount()`, all timers must stop. Leaked intervals would keep fetching after the component is removed.
- On data refresh, only **mandate counts** and **percentages** update. Party IDs stay stable, so the user's block assignments are preserved.
- If `apiUrl` or `pollIntervalMs` change (via `instance.update()`), the effect re-runs with the new values.

### `useBlockState`

Manages which parties are assigned to which block. Accepts optional `initialBlocks` so the host can restore a previous state.

```typescript
function useBlockState(parties: Party[], initialBlocks?: BlockState) {
  const [blocks, setBlocks] = useState<BlockState>(
    initialBlocks ?? { left: [], neutral: [], right: [] }
  )

  // When parties load for the first time (and no initial state was provided),
  // place all in neutral
  useEffect(() => {
    if (parties.length > 0 && !initialBlocks && allBlocksEmpty(blocks)) {
      setBlocks({
        left: [],
        neutral: parties.map(p => p.id),
        right: [],
      })
    }
  }, [parties])

  function moveParty(partyId: string, targetBlock: BlockId) {
    setBlocks(prev => {
      const next = {
        left:    prev.left.filter(id => id !== partyId),
        neutral: prev.neutral.filter(id => id !== partyId),
        right:   prev.right.filter(id => id !== partyId),
      }
      next[targetBlock].push(partyId)
      return next
    })
  }

  return { blocks, moveParty }
}
```

---

## Utility Functions

```typescript
function sumMandates(partyIds: string[], parties: Party[]): number {
  return partyIds.reduce((sum, id) => {
    const party = parties.find(p => p.id === id)
    return sum + (party?.mandates ?? 0)
  }, 0)
}

function formatTime(isoString: string | null): string {
  if (!isoString) return "—"
  return new Date(isoString).toLocaleTimeString("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}
```

---

## Project Structure

```
src/
├── index.ts                     # library entry: exports mount(), types
├── mount.ts                     # mount/unmount implementation
├── api/
│   └── electionApi.ts           # fetch + transform logic
├── components/
│   ├── Blokkbygger.tsx          # root component (receives config as props)
│   ├── Blokkbygger.module.css
│   ├── Header.tsx
│   ├── Header.module.css
│   ├── Block.tsx                # droppable zone
│   ├── Block.module.css
│   ├── PartyCard.tsx            # draggable party card
│   ├── PartyCard.module.css
│   ├── MandateCounter.tsx
│   ├── MandateCounter.module.css
│   └── ErrorBanner.tsx
├── hooks/
│   ├── useElectionData.ts       # API polling hook (config-driven)
│   └── useBlockState.ts         # block assignment state
├── types/
│   ├── api.ts                   # API response types
│   └── domain.ts                # app domain types + BlokkbyggerConfig
└── utils/
    ├── transformApiData.ts
    ├── sumMandates.ts
    └── formatTime.ts

dev/
└── main.tsx                     # standalone dev harness (not shipped in lib)
                                 # creates a <div>, calls mount() for local dev

tests/
├── e2e/
│   ├── blokkbygger.spec.ts      # main user-flow tests
│   ├── live-update.spec.ts      # polling/update tests
│   └── embed.spec.ts            # tests mount/unmount/update lifecycle
├── fixtures/
│   └── electionData.json        # snapshot of API response for mocking
└── playwright.config.ts

dist/                            # build output (not committed)
├── blokkbygger.es.js            # ESM bundle
├── blokkbygger.umd.js           # UMD bundle
└── blokkbygger.css              # all scoped styles
```

---

## Playwright E2E Tests

### Configuration

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox",  use: { browserName: "firefox" } },
    { name: "webkit",   use: { browserName: "webkit" } },
  ],
})
```

### Test Suite: Core User Flows

```typescript
// tests/e2e/blokkbygger.spec.ts
import { test, expect } from "@playwright/test"

test.describe("Blokkbygger", () => {

  test.beforeEach(async ({ page }) => {
    // Mock the API to get deterministic data
    await page.route("**/valg.nrk.no/api/2025/st", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockElectionData),
      })
    })
    await page.goto("/")
  })

  test("displays all category-1 parties and the 'An.' aggregate", async ({ page }) => {
    // 9 category-1 parties + 1 "An." = 10 total
    const partyCards = page.locator("[data-testid='party-card']")
    await expect(partyCards).toHaveCount(10)

    // Verify "An." exists
    await expect(page.getByText("An.")).toBeVisible()
  })

  test("all parties start in the neutral block", async ({ page }) => {
    const neutralBlock = page.locator("[data-testid='block-neutral']")
    const partyCards = neutralBlock.locator("[data-testid='party-card']")
    await expect(partyCards).toHaveCount(10)
  })

  test("can drag a party from neutral to the left block", async ({ page }) => {
    const apCard = page.locator("[data-testid='party-card-AP']")
    const leftBlock = page.locator("[data-testid='block-left']")

    // Perform drag
    await apCard.dragTo(leftBlock)

    // Verify AP is now in the left block
    await expect(
      leftBlock.locator("[data-testid='party-card-AP']")
    ).toBeVisible()

    // Verify mandate counter updated
    await expect(
      leftBlock.getByText("53 / 85 mandater")
    ).toBeVisible()
  })

  test("can drag a party from neutral to the right block", async ({ page }) => {
    const hCard = page.locator("[data-testid='party-card-H']")
    const rightBlock = page.locator("[data-testid='block-right']")

    await hCard.dragTo(rightBlock)

    await expect(
      rightBlock.locator("[data-testid='party-card-H']")
    ).toBeVisible()
  })

  test("shows majority indicator when a block reaches 85 mandates", async ({ page }) => {
    const leftBlock = page.locator("[data-testid='block-left']")

    // Drag AP (53) + FRP (47) to left = 100 mandates
    await page.locator("[data-testid='party-card-AP']").dragTo(leftBlock)
    await page.locator("[data-testid='party-card-FRP']").dragTo(leftBlock)

    // Should show majority
    await expect(leftBlock.getByText("Flertall")).toBeVisible()
  })

  test("can move a party between left and right blocks", async ({ page }) => {
    const leftBlock = page.locator("[data-testid='block-left']")
    const rightBlock = page.locator("[data-testid='block-right']")
    const apCard = page.locator("[data-testid='party-card-AP']")

    // Move to left
    await apCard.dragTo(leftBlock)
    await expect(leftBlock.locator("[data-testid='party-card-AP']")).toBeVisible()

    // Move from left to right
    await leftBlock.locator("[data-testid='party-card-AP']").dragTo(rightBlock)
    await expect(rightBlock.locator("[data-testid='party-card-AP']")).toBeVisible()

    // Left should now show 0
    await expect(leftBlock.getByText("0 / 85 mandater")).toBeVisible()
  })

  test("mandate counter updates correctly as parties are moved", async ({ page }) => {
    const leftBlock = page.locator("[data-testid='block-left']")

    // Drag R (9) to left
    await page.locator("[data-testid='party-card-RØDT']").dragTo(leftBlock)
    await expect(leftBlock.getByText("9 / 85 mandater")).toBeVisible()

    // Drag SV (9) to left → total 18
    await page.locator("[data-testid='party-card-SV']").dragTo(leftBlock)
    await expect(leftBlock.getByText("18 / 85 mandater")).toBeVisible()
  })
})
```

### Test Suite: Live Updates

```typescript
// tests/e2e/live-update.spec.ts
import { test, expect } from "@playwright/test"

test.describe("Live updates", () => {

  test("refreshes mandate counts without losing block assignments", async ({ page }) => {
    // Initial mock: AP has 53 mandates
    await page.route("**/valg.nrk.no/api/2025/st", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDataWith({ AP: { mandates: 53 } })),
      })
    })
    await page.goto("/")

    // Drag AP to left
    const leftBlock = page.locator("[data-testid='block-left']")
    await page.locator("[data-testid='party-card-AP']").dragTo(leftBlock)
    await expect(leftBlock.getByText("53 / 85 mandater")).toBeVisible()

    // Update mock: AP now has 55 mandates
    await page.route("**/valg.nrk.no/api/2025/st", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDataWith({ AP: { mandates: 55 } })),
      })
    })

    // Wait for the 30s poll (use clock manipulation to avoid real wait)
    await page.clock.fastForward(30_000)

    // AP should still be in left block, but with updated mandates
    await expect(leftBlock.locator("[data-testid='party-card-AP']")).toBeVisible()
    await expect(leftBlock.getByText("55 / 85 mandater")).toBeVisible()
  })

  test("shows error banner when API fails and recovers gracefully", async ({ page }) => {
    // First load succeeds
    let shouldFail = false
    await page.route("**/valg.nrk.no/api/2025/st", (route) => {
      if (shouldFail) {
        route.fulfill({ status: 500 })
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockElectionData),
        })
      }
    })
    await page.goto("/")

    // Trigger failure on next poll
    shouldFail = true
    await page.clock.fastForward(30_000)
    await expect(page.getByText("Kunne ikke hente valgdata")).toBeVisible()

    // Recover on next poll
    shouldFail = false
    await page.clock.fastForward(30_000)
    await expect(page.getByText("Kunne ikke hente valgdata")).not.toBeVisible()
  })

  test("displays the last-updated timestamp", async ({ page }) => {
    await page.route("**/valg.nrk.no/api/2025/st", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockElectionData),
      })
    })
    await page.goto("/")

    await expect(page.getByText("Sist oppdatert:")).toBeVisible()
  })
})
```

### Test Suite: Accessibility

```typescript
// tests/e2e/accessibility.spec.ts
import { test, expect } from "@playwright/test"

test.describe("Accessibility", () => {

  test("party cards are keyboard-navigable", async ({ page }) => {
    await page.goto("/")

    // Tab to first party card
    await page.keyboard.press("Tab")
    const focused = page.locator(":focus")
    await expect(focused).toHaveAttribute("data-testid", /party-card-/)

    // Verify aria attributes
    await expect(focused).toHaveAttribute("aria-roledescription", "draggable party")
  })

  test("blocks have accessible labels", async ({ page }) => {
    await page.goto("/")

    await expect(
      page.locator("[aria-label='Venstre-blokken']")
    ).toBeVisible()
    await expect(
      page.locator("[aria-label='Nøytral-blokken']")
    ).toBeVisible()
    await expect(
      page.locator("[aria-label='Høyre-blokken']")
    ).toBeVisible()
  })
})
```

---

## Key Design Decisions

### 1. State Preservation on Poll

When the API is re-fetched every 30 seconds, **only mandate counts and percentages update**. The user's block assignments are stored in a separate `BlockState` and keyed by stable party IDs — the drag state is never disrupted by incoming data.

### 2. Optimistic UI

Drag operations are instant — no server round-trip needed since all state is client-side. The only network activity is the periodic read-only poll.

### 3. "An." Aggregation

All non-category-1 parties are summed into a single `"An."` card. Currently these all have 0 mandates, but the aggregation handles future elections where minor parties might win seats.

### 4. Responsive Design

The three-column grid collapses to a vertical stack on mobile (`grid-cols-1 md:grid-cols-3`). Touch drag is supported natively by `@dnd-kit`.

### 5. Error Resilience

- API errors show a non-blocking banner. The last successful data remains displayed.
- The polling interval continues running even after an error — self-healing.

---

## Getting Started

```bash
# Scaffold
npm create vite@latest blokkbygger -- --template react-ts
cd blokkbygger

# Install runtime dependencies
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities clsx

# React is a peer dependency — install for local dev only
npm install -D react react-dom @types/react @types/react-dom

# Install test dependencies
npm install -D playwright @playwright/test vitest

# Install Playwright browsers
npx playwright install

# Run dev server (uses dev/main.tsx harness)
npm run dev

# Build library (ESM + UMD + CSS)
npm run build

# Run Playwright tests
npx playwright test

# Run unit tests
npx vitest
```

### package.json Library Fields

```jsonc
{
  "name": "@nrk/blokkbygger",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/blokkbygger.umd.js",
  "module": "dist/blokkbygger.es.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/blokkbygger.es.js",
      "require": "./dist/blokkbygger.umd.js"
    },
    "./style.css": "./dist/blokkbygger.css"
  },
  "peerDependencies": {
    "react": "^18 || ^19",
    "react-dom": "^18 || ^19"
  },
  "files": ["dist"]
}
```

---

## Playwright Tests: Embed Lifecycle

In addition to the core user-flow and live-update tests (unchanged from above), the embeddable architecture requires testing the `mount` / `unmount` / `update` lifecycle:

```typescript
// tests/e2e/embed.spec.ts
import { test, expect } from "@playwright/test"

test.describe("Embed lifecycle", () => {

  test("mount renders the component into an arbitrary container", async ({ page }) => {
    await page.goto("/")
    // The dev harness mounts into a <div id="graphic-slot">
    const slot = page.locator("#graphic-slot")
    await expect(slot.locator("[data-testid='block-neutral']")).toBeVisible()
  })

  test("unmount removes the component and stops polling", async ({ page }) => {
    await page.goto("/")

    // Verify it's mounted
    await expect(page.locator("[data-testid='block-neutral']")).toBeVisible()

    // Call unmount via the dev harness's exposed button
    await page.locator("[data-testid='unmount-btn']").click()

    // Component should be gone
    await expect(page.locator("[data-testid='block-neutral']")).not.toBeVisible()

    // No further network requests after unmount
    const requests: string[] = []
    page.on("request", (req) => {
      if (req.url().includes("valg.nrk.no")) requests.push(req.url())
    })
    await page.clock.fastForward(60_000)
    expect(requests).toHaveLength(0)
  })

  test("update() changes config without remounting", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("[data-testid='block-neutral']")).toBeVisible()

    // Drag AP to left
    const leftBlock = page.locator("[data-testid='block-left']")
    await page.locator("[data-testid='party-card-AP']").dragTo(leftBlock)

    // Call update() to change majority threshold to 50
    await page.locator("[data-testid='update-threshold-btn']").click()

    // AP's 53 mandates now exceeds the new threshold of 50
    await expect(leftBlock.getByText("Flertall")).toBeVisible()
  })

  test("multiple instances can coexist on the same page", async ({ page }) => {
    // The dev harness mounts two instances in separate containers
    await page.goto("/multi-instance")

    const slot1 = page.locator("#slot-1")
    const slot2 = page.locator("#slot-2")

    await expect(slot1.locator("[data-testid='block-neutral']")).toBeVisible()
    await expect(slot2.locator("[data-testid='block-neutral']")).toBeVisible()

    // Drag in slot 1 should not affect slot 2
    await slot1.locator("[data-testid='party-card-AP']")
      .dragTo(slot1.locator("[data-testid='block-left']"))

    // AP in slot 1's left block
    await expect(
      slot1.locator("[data-testid='block-left'] [data-testid='party-card-AP']")
    ).toBeVisible()

    // AP still in slot 2's neutral block
    await expect(
      slot2.locator("[data-testid='block-neutral'] [data-testid='party-card-AP']")
    ).toBeVisible()
  })
})
```

---

## Open Questions / Future Considerations

1. **State persistence**: The host can call `instance.getState()` before unmounting and pass that state back as `initialBlocks` on next mount. No `localStorage` needed — the host owns persistence.
2. **Multiple elections**: The API URL is now a config prop. The host can point different instances at different election endpoints (`2025/st`, `2025/fy`, etc.).
3. **Dark mode**: The API provides both `lysModus` and `morkModus` colors. The host can set `--bb-card-bg`, `--bb-text-color`, etc. via CSS Custom Properties — no internal theme toggle needed.
4. **Animation**: `@dnd-kit` supports spring-based animations via `measuring` config — could add smooth transitions when mandate counts update.
5. **CORS**: If the NRK API doesn't set `Access-Control-Allow-Origin` for the deployment domain, the host system's proxy layer should handle this — not the component itself.
6. **Bundle size**: With React externalized and CSS Modules (no Tailwind runtime), the component JS bundle should be under 30KB gzipped. Worth measuring and setting a size budget in CI.
