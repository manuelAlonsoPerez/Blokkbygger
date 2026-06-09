# High-Order Functionality

This document explains how the Blokkbygger components are developed, how they interact, and how data flows through the system from the NRK election API to the user's screen.

---

## 1. Data Flow Overview

```
  NRK API                useElectionData           useBlockState              UI
 ──────────          ─────────────────────       ─────────────────       ──────────────
│ /api/2025/st │ ──► │ fetch → transform  │ ──► │ parties[] ──────► │ Blokkbygger  │
│              │     │ poll every 30s      │     │ blocks: {        │ │ Block x3    │
│ JSON response│     │ Party[] + metadata  │     │   left: [ids]    │ │ PartyCard[] │
 ──────────          ─────────────────────       │   neutral:[ids]  │ │ MandateCount│
                                                 │   right: [ids]   │  ──────────────
                                                  ─────────────────
                                                   ▲           │
                                                   │           ▼
                                              moveParty()   onBlockChange()
                                              (user drag)   (notify host)
```

The architecture separates concerns into three layers:

1. **Data layer** — `useElectionData` handles fetching, polling, and transforming raw API responses into a clean `Party[]` array.
2. **State layer** — `useBlockState` manages which parties belong to which block, independent of the data layer. This separation ensures that when the API is re-polled, the user's drag assignments are never lost.
3. **Presentation layer** — Components render the current state and capture drag interactions.

---

## 2. The Mount System (`mount.ts`)

The component is not a standalone application. It is a **library** that exposes a `mount()` function, making it embeddable in any host system.

### How it works

```
Host calls mount(container, config)
       │
       ▼
┌─────────────────────────────┐
│  1. Merge config with       │
│     defaults (apiUrl,       │
│     pollIntervalMs, etc.)   │
│                             │
│  2. createRoot(container)   │
│     from react-dom/client   │
│                             │
│  3. Render <Blokkbygger>    │
│     with merged config      │
│     as props                │
│                             │
│  4. Return instance handle: │
│     - update(newConfig)     │
│     - getState()            │
│     - unmount()             │
└─────────────────────────────┘
```

**Why `createElement` instead of JSX**: The `mount.ts` file uses `createElement()` rather than JSX syntax. This is intentional — `mount.ts` is the boundary between the framework-agnostic public API and the React internals. The host system never needs to know React is involved; it only calls plain JavaScript functions.

### Lifecycle methods

| Method | What it does |
|---|---|
| `mount(container, config)` | Creates a React root inside the given DOM element and renders the component. Returns an instance handle. |
| `instance.update(config)` | Merges new config into the current config and re-renders. Useful when the host wants to change the API URL or poll interval mid-session. |
| `instance.getState()` | Returns the current `BlockState` — which party IDs are in which block. The host can serialize this for persistence. |
| `instance.unmount()` | Calls `root.unmount()`, which triggers React's cleanup. All `useEffect` cleanup functions run, stopping the polling interval. No leaked timers. |

---

## 3. Component Hierarchy

```
<Blokkbygger>                          Root — orchestrates everything
├── <Header>                           Displays title and last-updated time
├── <DndContext>                       @dnd-kit context — enables drag and drop
│   ├── <Block id="left">              Droppable zone — "Venstre"
│   │   ├── <SortableContext>          Wraps sortable items within this block
│   │   │   ├── <PartyCard>            Draggable party (e.g., AP)
│   │   │   ├── <PartyCard>            Draggable party (e.g., SV)
│   │   │   └── ...
│   │   └── <MandateCounter>           Sum display — "71 / 85 mandater"
│   │
│   ├── <Block id="neutral">           Droppable zone — "Nøytral"
│   │   ├── <SortableContext>
│   │   │   └── <PartyCard> ...
│   │   └── (no MandateCounter)
│   │
│   └── <Block id="right">             Droppable zone — "Høyre"
│       ├── <SortableContext>
│       │   └── <PartyCard> ...
│       └── <MandateCounter>
│
└── <ErrorBanner>                      Shown conditionally on API errors
```

---

## 4. Component Development Details

### 4.1 `<Blokkbygger>` — The Root Component

**File**: `src/components/Blokkbygger.tsx`

This is the top-level component. It does not fetch data or manage state directly — it **delegates** to two custom hooks and **composes** the child components.

**Responsibilities:**

1. **Wires up hooks**: Calls `useElectionData(apiUrl, pollIntervalMs)` for data and `useBlockState(parties, initialBlocks)` for block assignments.
2. **Configures drag sensors**: Registers `PointerSensor` (with a 5px activation distance to prevent accidental drags) and `KeyboardSensor` for accessibility.
3. **Resolves drag targets**: When a drag ends, `handleDragEnd` determines which block the item was dropped on. It checks two cases:
   - The drop target is a block container itself (the user dropped on empty space inside a block).
   - The drop target is another party card — in which case it looks up which block contains that card.
4. **Computes derived state**: `sumMandates()` calculates totals for left and right blocks. These are derived values, not stored in state — they update automatically when `blocks` or `parties` change.
5. **Notifies the host**: An `onBlockChange` callback fires whenever the `blocks` state changes, letting the host system react to user interactions.
6. **Handles loading**: Shows a loading message until the first API response arrives.

### 4.2 `<Block>` — Droppable Zone

**File**: `src/components/Block.tsx`

Each `Block` represents one political column (Venstre, Nøytral, or Høyre).

**Responsibilities:**

1. **Registers as a drop target**: Uses `useDroppable({ id })` from `@dnd-kit/core`. The `id` matches the `BlockId` type (`"left"`, `"neutral"`, `"right"`), which is how `Blokkbygger` resolves where a dragged item was dropped.
2. **Provides sortable context**: Wraps its party cards in `<SortableContext>` with a `verticalListSortingStrategy`, enabling reordering within the block.
3. **Visual feedback on hover**: When a party card is dragged over this block, `isOver` becomes `true`, triggering the `dropTarget` CSS class (highlighted border and background).
4. **Conditional mandate counter**: Only the left and right blocks receive `totalMandates` as a prop. The neutral block has no counter — it is a holding area, not a coalition.
5. **Majority indicator**: When `hasMajority` is `true`, the block gets a green ring via the `hasMajority` CSS class.

### 4.3 `<PartyCard>` — Draggable Item

**File**: `src/components/PartyCard.tsx`

Each card represents one political party (or the "An." aggregate).

**Responsibilities:**

1. **Registers as sortable/draggable**: Uses `useSortable({ id: party.id })` which provides:
   - `setNodeRef` — attaches the drag behavior to the DOM element.
   - `attributes` and `listeners` — spread onto the element for pointer/keyboard event handling.
   - `transform` — the current drag offset, converted to a CSS transform string.
   - `isDragging` — boolean for visual feedback.
2. **Displays party data**: Color dot (inline `backgroundColor`), short name, mandate count, and vote percentage.
3. **Accessibility**: Each card has `role="button"`, `aria-roledescription="draggable party"`, and an `aria-label` describing the party and its mandates. This makes the component usable with screen readers and keyboard navigation.
4. **Test hooks**: `data-testid={party-card-${party.id}}` enables Playwright to locate specific party cards reliably.

### 4.4 `<MandateCounter>` — Coalition Total

**File**: `src/components/MandateCounter.tsx`

A presentational component that shows the mandate sum for a block.

**Responsibilities:**

1. **Displays total vs threshold**: Renders `"{total} / {threshold} mandater"`. The threshold is configurable (defaults to 85).
2. **Visual state**: Switches between `majority` (green) and `noMajority` (gray) CSS classes based on the `hasMajority` prop.
3. **Majority label**: When the threshold is met, appends a checkmark and "Flertall" (majority).

### 4.5 `<Header>` — Metadata Display

**File**: `src/components/Header.tsx`

Displays the app title and the timestamp of the last successful API response.

**Responsibilities:**

1. **Formats the timestamp**: Delegates to `formatTime()`, which converts the ISO string from the API (`"2025-09-10T08:57:06"`) into a Norwegian locale time string (`"08:57:06"`).
2. **Handles null state**: Before the first API response, `lastUpdated` is `null` — `formatTime` returns an em dash.

### 4.6 `<ErrorBanner>` — Error Feedback

**File**: `src/components/ErrorBanner.tsx`

A simple alert banner rendered conditionally when the API fetch fails.

**Responsibilities:**

1. **Non-blocking**: Renders below the blocks, not instead of them. The last successful data remains visible.
2. **Self-clearing**: When the next poll succeeds, the `error` state in `useElectionData` is set back to `null`, and the banner disappears.
3. **Accessible**: Uses `role="alert"` so screen readers announce the error immediately.

---

## 5. Custom Hooks

### 5.1 `useElectionData` — API Polling

**File**: `src/hooks/useElectionData.ts`

**Inputs**: `apiUrl` (string), `pollIntervalMs` (number)

**Outputs**: `{ parties, lastUpdated, isLoading, error }`

**How it works:**

1. On mount, calls `fetchData()` immediately.
2. Sets up a `setInterval` to call `fetchData()` every `pollIntervalMs` milliseconds.
3. `fetchData()` fetches the API, parses the JSON, and runs it through `transformApiData()`.
4. On success: updates `parties` and `lastUpdated`, clears `error`.
5. On failure: sets `error` but does **not** clear `parties` — the last good data persists.
6. On unmount: the `useEffect` cleanup function clears the interval. This is critical in an embeddable context where `instance.unmount()` must stop all side effects.

**Reactivity**: The `useEffect` depends on `fetchData` (memoized with `useCallback` on `apiUrl`) and `pollIntervalMs`. If the host calls `instance.update({ apiUrl: "..." })`, the effect restarts with the new URL.

### 5.2 `useBlockState` — Block Assignments

**File**: `src/hooks/useBlockState.ts`

**Inputs**: `parties` (Party[]), `initialBlocks?` (BlockState)

**Outputs**: `{ blocks, moveParty }`

**How it works:**

1. Initializes state from `initialBlocks` (if the host provides one) or an empty `{ left: [], neutral: [], right: [] }`.
2. When `parties` loads for the first time and no initial blocks were provided, places all party IDs into the `neutral` block.
3. `moveParty(partyId, targetBlock)` removes the party from whichever block currently contains it and appends it to the target block. This is an immutable state update using filter + spread.

**Key design decision**: Block state stores **party IDs**, not party objects. When the API refreshes with new mandate counts, the `parties` array updates but the `blocks` state (which only contains string IDs) is untouched. The components re-render with the new mandate numbers because they look up parties by ID on each render.

---

## 6. Data Transformation

**File**: `src/utils/transformApiData.ts`

The NRK API returns all parties, including regional and minor parties. The transform function applies two rules from the case requirements:

1. **Category 1 parties** (landsdekkende / nationwide) are kept as individual entries.
2. **All other categories** (2, 3, etc.) have their mandates and vote percentages summed into a single synthetic party called `"An."` (Andre / Others).

This produces a stable `Party[]` array where:
- IDs are deterministic (sourced from the API's `parti.id` field, or `"andre"` for the aggregate).
- The "An." party always exists, even if all minor parties have 0 mandates.

---

## 7. Styling Strategy

All styles use **CSS Modules** (`*.module.css`). At build time, Vite hashes every class name (e.g., `.container` becomes `._container_1a2b3`), guaranteeing no collisions with the host system's styles.

**Theming** is handled through CSS Custom Properties with a `--bb-` prefix:

| Variable | Default | Purpose |
|---|---|---|
| `--bb-font-family` | `system-ui, sans-serif` | Base font |
| `--bb-text-color` | `#1a1a1a` | Primary text color |
| `--bb-text-secondary` | `#6b7280` | Mandates, timestamps |
| `--bb-text-tertiary` | `#9ca3af` | Percentages |
| `--bb-card-bg` | `#fff` | Party card background |
| `--bb-card-border` | `#e5e7eb` | Party card border |
| `--bb-border-color` | `#e5e7eb` | Block container border |
| `--bb-accent` | `#60a5fa` | Drop target highlight |
| `--bb-drop-bg` | `#eff6ff` | Drop target background |
| `--bb-majority-color` | `#22c55e` | Majority ring color |
| `--bb-majority-bg` | `#dcfce7` | Majority counter background |
| `--bb-majority-text` | `#166534` | Majority counter text |
| `--bb-error-bg` | `#fef2f2` | Error banner background |
| `--bb-error-text` | `#991b1b` | Error banner text |

The host overrides any of these on the container element:

```css
#graphic-slot {
  --bb-font-family: "NRK Sans", system-ui;
  --bb-card-bg: #2a2a2a;
  --bb-text-color: #ffffff;
}
```

---

## 8. Interaction Model

### Drag and Drop

The drag system uses three layers from `@dnd-kit`:

```
DndContext (in Blokkbygger)
  │
  ├── useDroppable (in each Block)     ← registers blocks as drop zones
  │
  └── useSortable (in each PartyCard)  ← registers cards as draggable + sortable
        │
        └── SortableContext (in Block)  ← groups sortable items within a block
```

**Drag flow:**

1. User grabs a `PartyCard` (pointer down + 5px movement, or keyboard activation).
2. `@dnd-kit` tracks the pointer position and overlays a drag preview.
3. As the pointer enters a `Block`, that block's `isOver` becomes `true` (visual highlight).
4. On drop, `DndContext` fires `onDragEnd` with `active` (the dragged card) and `over` (the drop target).
5. `Blokkbygger.handleDragEnd` resolves which block the target belongs to and calls `moveParty()`.
6. `useBlockState` updates the `blocks` state, triggering a re-render.
7. The `onBlockChange` callback notifies the host.

### Keyboard Support

`KeyboardSensor` allows users to:
- Tab to a party card.
- Press Space/Enter to pick it up.
- Use arrow keys to move it between blocks.
- Press Space/Enter again to drop.

This is provided by `@dnd-kit` with no additional code.

---

## 9. Error Handling

The system handles errors at two levels:

| Scenario | Behavior |
|---|---|
| **First fetch fails** | Loading state remains. Error banner shown. Polling continues — next poll may succeed. |
| **Subsequent fetch fails** | Last successful `parties` data stays rendered. Error banner appears. User's block assignments are untouched. |
| **Network recovery** | Next successful poll clears the error, updates parties, and the banner disappears. |
| **API returns non-200** | Treated as a fetch error. Same recovery path. |
| **Invalid JSON** | Caught by try/catch in `fetchData`. Same error path. |

The key principle is **graceful degradation**: the component never goes blank after a successful initial load. The user's work (block assignments) is always preserved.
