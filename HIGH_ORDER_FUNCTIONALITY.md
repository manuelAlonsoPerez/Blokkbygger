# High-Order Functionality

This document explains how the Blokkbygger components are developed, how they interact, and how data flows through the system from the NRK election API to the user's screen.

---

## 1. Data Flow Overview

```
  NRK API                useElectionData              useBlockState              UI
 ──────────          ──────────────────────       ──────────────────       ──────────────
│ /api/2025/st │ ──► │ fetch → transform   │ ──► │ parties[]  ──────► │ Blokkbygger  │
│              │     │ poll every 30s       │     │ blocks: {         │ │ Header      │
│ JSON response│     │ Party[] + metadata:  │     │   left: [ids]     │ │ Block x3    │
│              │     │  totalMandates       │     │   neutral: [ids]  │ │ PartyCard[] │
│              │     │  turnoutPercent      │     │   right: [ids]    │ │ MandateCount│
│              │     │  countedPercent      │     │ }                 │  ──────────────
 ──────────          ──────────────────────        ──────────────────
                                                   ▲            │
                                                   │            ▼
                                              moveParty()    onBlockChange()
                                              (user drag)    (notify host)
```

The architecture separates concerns into three layers:

1. **Data layer** — `useElectionData` handles fetching, polling, and transforming raw API responses into a clean `Party[]` array, plus election-level metadata (`totalMandates`, `turnoutPercent`, `countedPercent`).
2. **State layer** — `useBlockState` manages which parties belong to which block, independent of the data layer. On first mount it distributes parties into predefined political blocs (left: R, SV, AP, MDG; right: V, H, FRP, KRF; neutral: the rest). This separation ensures that when the API is re-polled, the user's drag assignments are never lost.
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
<Blokkbygger>                          Root — orchestrates data, state, and layout
├── <Header>                           Title, election stats, and timestamp
│     └── Frammøte %, Opptalt %, Mandater, Flertall
├── <DndContext>                       @dnd-kit context — enables drag and drop
│   ├── <Block id="left">              Droppable zone — "VENSTRE"
│   │   ├── <div.cards>                Flex-grow area for party cards
│   │   │   ├── <SortableContext>
│   │   │   │   ├── <PartyCard>        Draggable party (e.g., AP)
│   │   │   │   └── ...
│   │   └── <MandateCounter>           Pinned to bottom — "79 / 169 mandater ✓ Flertall"
│   │
│   ├── <Block id="neutral">           Droppable zone — "NØYTRAL"
│   │   ├── <div.cards>
│   │   │   └── <PartyCard> ...
│   │   └── <MandateCounter>           "10 / 169 mandater" (no majority indicator)
│   │
│   └── <Block id="right">             Droppable zone — "HØYRE"
│       ├── <div.cards>
│       │   └── <PartyCard> ...
│       └── <MandateCounter>           "81 / 169 mandater"
│
└── <ErrorBanner>                      Shown conditionally on API errors
```

---

## 4. Component Development Details

### 4.1 `<Blokkbygger>` — The Root Component

**File**: `src/components/Blokkbygger/Blokkbygger.tsx`

The top-level component. It **delegates** to two custom hooks and **composes** the child components.

**Responsibilities:**

1. **Wires up hooks**: Calls `useElectionData(apiUrl, pollIntervalMs)` for party data and election metadata (`totalMandates`, `turnoutPercent`, `countedPercent`), and `useBlockState(parties, initialBlocks)` for block assignments.
2. **Computes majority threshold dynamically**: Uses `Math.ceil(totalMandates / 2)` from the API's `mandater.antall` field. For 169 total mandates this yields 85. The host can override this via the optional `majorityThreshold` prop.
3. **Configures drag sensors**: Registers `PointerSensor` (with a 5px activation distance to prevent accidental drags) and `KeyboardSensor` for accessibility.
4. **Resolves drag targets**: When a drag ends, `handleDragEnd` determines which block the item was dropped on — either a block container directly, or another party card (resolved to its containing block).
5. **Computes derived state**: `sumMandates()` calculates totals for all three blocks. These are derived values, not stored in state — they update automatically when `blocks` or `parties` change.
6. **Notifies the host**: An `onBlockChange` callback fires whenever the `blocks` state changes.
7. **Handles loading**: Shows a loading message until the first API response arrives.

### 4.2 `<Block>` — Droppable Zone

**File**: `src/components/Blokkbygger/Block.tsx`

Each `Block` represents one political column (Venstre, Nøytral, or Høyre). Uses flexbox layout with `flex-direction: column` to pin the mandate counter to the bottom.

**Responsibilities:**

1. **Registers as a drop target**: Uses `useDroppable({ id })` from `@dnd-kit/core`. The `id` matches the `BlockId` type (`"left"`, `"neutral"`, `"right"`).
2. **Provides sortable context**: Wraps its party cards in `<SortableContext>` with a `verticalListSortingStrategy`, enabling reordering within the block.
3. **Visual feedback on hover**: When a party card is dragged over this block, `isOver` becomes `true`, triggering the `dropTarget` CSS class (NRK blue border and background).
4. **Mandate counter at bottom**: All three blocks show a `MandateCounter` displaying `total / totalMandatesInElection mandater`. The cards area uses `flex: 1` to push the counter to the bottom regardless of card count.
5. **Majority indicator**: Left and right blocks show a green ring and "Flertall" label when their mandate total meets the threshold.

### 4.3 `<PartyCard>` — Draggable Item

**File**: `src/components/Blokkbygger/PartyCard.tsx`

Each card represents one political party (or the "An." aggregate).

**Responsibilities:**

1. **Registers as sortable/draggable**: Uses `useSortable({ id: party.id })` which provides `setNodeRef`, `attributes`, `listeners`, `transform`, and `isDragging`.
2. **Displays party data**: Color dot (from API party color), short name, mandate count, and vote percentage. Percentages for parties with 0 mandates display as `0%` (guarded against `NaN`).
3. **Accessibility**: Each card has `role="button"`, `aria-roledescription="draggable party"`, and an `aria-label` describing the party and its mandates.
4. **Test hooks**: `data-testid={party-card-${party.id}}` enables Playwright to locate specific party cards.

### 4.4 `<MandateCounter>` — Block Total

**File**: `src/components/Blokkbygger/MandateCounter.tsx`

A presentational component pinned to the bottom of each block.

**Responsibilities:**

1. **Displays block total vs election total**: Renders `"total / outOf mandater"` where `outOf` is the total mandates in the election (from `mandater.antall`).
2. **Visual state**: Switches between `majority` (green) and `noMajority` (gray) CSS classes based on the `hasMajority` prop.
3. **Majority label**: When a block with a threshold set reaches majority, appends a checkmark and "Flertall".

### 4.5 `<Header>` — Election Dashboard Bar

**File**: `src/components/Blokkbygger/Header.tsx`

A dark navy bar (NRK style `#0a2343`) displaying the app title, election statistics, and last-updated timestamp.

**Responsibilities:**

1. **Title**: "Blokkbygger" aligned left.
2. **Election stats** (aligned right, separated by vertical dividers):
   - **Frammøte** — voter turnout percentage from `frammote.prosent`.
   - **Opptalt** — percentage of votes counted from `opptaltProsent`.
   - **Mandater** — total seats in parliament from `mandater.antall`.
   - **Flertall** — the majority threshold (`Math.ceil(totalMandates / 2)`).
3. **Timestamp**: "Sist oppdatert 10. september 2025 kl. 08:56" — formatted by `formatTime()` using Norwegian locale date and time.

### 4.6 `<ErrorBanner>` — Error Feedback

**File**: `src/components/Blokkbygger/ErrorBanner.tsx`

A simple alert banner rendered conditionally when the API fetch fails.

**Responsibilities:**

1. **Non-blocking**: Renders below the blocks, not instead of them. The last successful data remains visible.
2. **Self-clearing**: When the next poll succeeds, the `error` state resets and the banner disappears.
3. **Accessible**: Uses `role="alert"` so screen readers announce the error immediately.

---

## 5. Custom Hooks

### 5.1 `useElectionData` — API Polling

**File**: `src/hooks/useElectionData.ts`

**Inputs**: `apiUrl` (string), `pollIntervalMs` (number)

**Outputs**: `{ parties, totalMandates, turnoutPercent, countedPercent, lastUpdated, isLoading, error }`

**How it works:**

1. On mount, calls `fetchData()` immediately.
2. Sets up a `setInterval` to call `fetchData()` every `pollIntervalMs` milliseconds.
3. `fetchData()` fetches the API, parses the JSON, and runs it through `transformApiData()`.
4. On success: updates `parties`, `totalMandates` (from `mandater.antall`), `turnoutPercent` (from `frammote.prosent`), `countedPercent` (from `opptaltProsent`), and `lastUpdated`. Clears `error`.
5. On failure: sets `error` but does **not** clear `parties` or metadata — the last good data persists.
6. On unmount: the `useEffect` cleanup function clears the interval. This is critical in an embeddable context where `instance.unmount()` must stop all side effects.

**Reactivity**: The `useEffect` depends on `fetchData` (memoized with `useCallback` on `apiUrl`) and `pollIntervalMs`. If the host calls `instance.update({ apiUrl: "..." })`, the effect restarts with the new URL.

### 5.2 `useBlockState` — Block Assignments

**File**: `src/hooks/useBlockState.ts`

**Inputs**: `parties` (Party[]), `initialBlocks?` (BlockState)

**Outputs**: `{ blocks, moveParty }`

**How it works:**

1. Initializes state from `initialBlocks` (if the host provides one) or an empty `{ left: [], neutral: [], right: [] }`.
2. When `parties` loads for the first time and no initial blocks were provided, distributes parties into **predefined default blocs**:
   - **Left**: Rødt (`RØDT`), SV (`SV`), Arbeiderpartiet (`A`), MDG (`MDG`)
   - **Right**: Venstre (`V`), Høyre (`H`), Fremskrittspartiet (`FRP`), Kristelig Folkeparti (`KRF`)
   - **Neutral**: Senterpartiet (`SP`), An. (`andre`), and any other party
3. `moveParty(partyId, targetBlock)` removes the party from whichever block currently contains it and appends it to the target block. This is an immutable state update using filter + spread.

**Key design decision**: Block state stores **party IDs**, not party objects. When the API refreshes with new mandate counts, the `parties` array updates but the `blocks` state (which only contains string IDs) is untouched. The components re-render with the new mandate numbers because they look up parties by ID on each render.

---

## 6. Data Transformation

**File**: `src/utils/transformApiData.ts`

The NRK API returns all parties, including regional and minor parties. The transform function applies two rules from the case requirements:

1. **Category 1 parties** (landsdekkende / nationwide) are kept as individual entries.
2. **All other categories** (2, 3, etc.) have their mandates and vote percentages summed into a single synthetic party called `"An."` (Andre / Others).

Percentage values are guarded against `null`/`undefined` with `?? 0` to prevent `NaN` in the UI. The "An." percentage uses a falsy check before rounding.

This produces a stable `Party[]` array where:
- IDs are deterministic (sourced from the API's `parti.id` field, or `"andre"` for the aggregate).
- The "An." party always exists, even if all minor parties have 0 mandates.

---

## 7. Styling Strategy

All styles use **CSS Modules** (`*.module.css`). At build time, Vite hashes every class name (e.g., `.container` becomes `._container_1a2b3`), guaranteeing no collisions with the host system's styles.

The visual design matches the [NRK Valg 2025 resultat](https://www.nrk.no/valg/2025/resultat/) page using their color palette.

**Theming** is handled through CSS Custom Properties with a `--bb-` prefix:

| Variable | Default | Purpose |
|---|---|---|
| `--bb-font-family` | `"NRK Sans Variable", system-ui` | Base font |
| `--bb-bg` | `#eef5ff` | Page background (NRK light blue) |
| `--bb-text-color` | `#061629` | Primary text (NRK dark navy) |
| `--bb-text-secondary` | `#304968` | Mandates, timestamps |
| `--bb-text-tertiary` | `#7b97ba` | Percentages |
| `--bb-header-bg` | `#0a2343` | Header bar (NRK navy) |
| `--bb-header-text` | `#ffffff` | Header text |
| `--bb-header-secondary` | `#bccde4` | Header labels |
| `--bb-block-bg` | `#ffffff` | Block container background |
| `--bb-card-bg` | `#ffffff` | Party card background |
| `--bb-card-hover-bg` | `#f0f5fb` | Party card hover |
| `--bb-card-border` | `#d9e9ff` | Party card border |
| `--bb-border-color` | `#d9e9ff` | Block container border |
| `--bb-accent` | `#1767ce` | Drop target highlight (NRK blue) |
| `--bb-drop-bg` | `#f0f5fb` | Drop target background |
| `--bb-majority-color` | `#22c55e` | Majority ring |
| `--bb-majority-bg` | `#dcfce7` | Majority counter background |
| `--bb-majority-text` | `#166534` | Majority counter text |
| `--bb-error-bg` | `#fef2f2` | Error banner background |
| `--bb-error-text` | `#991b1b` | Error banner text |

The host overrides any of these on the container element:

```css
#graphic-slot {
  --bb-font-family: "NRK Sans Variable", system-ui;
  --bb-bg: #141517;
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
3. As the pointer enters a `Block`, that block's `isOver` becomes `true` (NRK blue highlight).
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
| **Subsequent fetch fails** | Last successful data stays rendered. Error banner appears. User's block assignments are untouched. |
| **Network recovery** | Next successful poll clears the error, updates all data, and the banner disappears. |
| **API returns non-200** | Treated as a fetch error. Same recovery path. |
| **Invalid JSON** | Caught by try/catch in `fetchData`. Same error path. |
| **`NaN` percentages** | Guarded in `transformApiData` (`?? 0`) and in `PartyCard` display (`|| 0`). |

The key principle is **graceful degradation**: the component never goes blank after a successful initial load. The user's work (block assignments) is always preserved.

---

## 10. Architecture Pattern: Composition + Custom Hooks

### The pattern we use

Blokkbygger follows the **Composition + Custom Hooks** pattern (sometimes called **Compound Components**). This is the dominant architecture in modern React for building reusable, embeddable component libraries.

It consists of two ideas working together:

1. **Custom Hooks for shared logic** — Stateful behavior (data fetching, block management) lives in hooks (`useElectionData`, `useBlockState`) that are called inside components, not wrapped around them.
2. **Direct composition for UI** — Parent components render child components via explicit typed props. `Blokkbygger` renders `Block`, `Block` renders `PartyCard`. Each component owns a single responsibility and declares exactly what it needs through its props interface.

```
Composition + Hooks

  Blokkbygger
  ├── useElectionData(apiUrl, interval)    ← hook provides parties + metadata
  ├── useBlockState(parties)               ← hook provides state + actions
  ├── Math.ceil(totalMandates / 2)         ← derived majority threshold
  │
  ├── renders <Header>                     ← election stats dashboard
  ├── renders <Block> x3                   ← droppable zones with MandateCounter
  │     └── renders <PartyCard>
  └── renders <ErrorBanner>
```

The third-party library `@dnd-kit` adds a layer of **Context Providers** (`DndContext`, `SortableContext`) that use the `children` prop pattern to inject drag-and-drop behavior into the tree. Our own components sit inside those providers but do not replicate that pattern — they compose via explicit props instead.

### Why not Higher-Order Components (HOC)?

A HOC is a function that takes a component and returns a new enhanced component:

```typescript
// HOC approach (not used)
const withElectionData = (WrappedComponent) => {
  return function EnhancedComponent(props) {
    const data = useElectionData(props.apiUrl, props.pollIntervalMs);
    return <WrappedComponent {...props} {...data} />;
  };
};

const EnhancedBlokkbygger = withElectionData(Blokkbygger);
```

We chose **not** to use HOCs for the following reasons:

| Concern | HOC | Hooks |
|---|---|---|
| **Prop origin** | Injected implicitly — reading `EnhancedBlokkbygger` doesn't tell you where `parties` comes from without finding the HOC | Called explicitly inside the component — `const { parties } = useElectionData(...)` is self-documenting |
| **Prop collisions** | If two HOCs inject a prop with the same name, one silently overwrites the other | Not possible — each hook returns its own scoped variables |
| **Ref forwarding** | HOCs break `ref` unless you manually use `React.forwardRef` | No issue — hooks don't wrap components |
| **Static analysis** | TypeScript cannot easily infer the combined props of stacked HOCs | Hooks have straightforward return types that TypeScript infers naturally |
| **DevTools readability** | Multiple HOCs create deeply nested wrapper components in React DevTools | Hooks appear as named hooks inside a single component — flat and readable |
| **Reuse across components** | The HOC must be applied to each component that needs the logic | The hook is called inside any component — just a function call |
| **Composability** | Stacking HOCs (`withA(withB(withC(Component)))`) is fragile and order-dependent | Multiple hooks compose naturally as independent function calls within one component |

**Bottom line**: HOCs solve the problem of reusing logic across components, but hooks solve the same problem with less indirection, better TypeScript support, and no wrapper layers. Since React 16.8 introduced hooks, HOCs are considered a legacy pattern — React's own documentation recommends hooks for new code.

### Why not Render Props?

The render prop pattern passes a function as a prop to control what a component renders:

```typescript
// Render prop approach (not used)
<ElectionDataProvider
  apiUrl="https://valg.nrk.no/api/2025/st"
  render={({ parties, error }) => (
    <BlockManager parties={parties}>
      {({ blocks, moveParty }) => (
        <div>
          <Block partyIds={blocks.left} parties={parties} />
        </div>
      )}
    </BlockManager>
  )}
/>
```

We avoided render props because:

- **Nesting depth**: Each layer of shared logic adds another level of callback indentation. With two hooks (data + block state), we would already have two levels of nesting inside the JSX.
- **Readability**: The logic that provides data is visually far from the JSX that consumes it, separated by layers of callbacks.
- **Same problem hooks solve**: Render props were the pre-hooks solution for sharing stateful logic. Hooks are strictly simpler for the same use case.

### Why not Component Prop?

The component prop pattern passes a component reference to a wrapper:

```typescript
// Component prop approach (not used)
<Wrapper component={PartyCard} partyData={party} />
```

This pattern is useful when a parent needs to render an **interchangeable** child — e.g., a list component that accepts different row renderers. In our case, `Block` always renders `PartyCard`. There is no scenario where a `Block` would render a different kind of card, so the flexibility of the component prop pattern adds nothing.

### Why not Context for everything?

React Context is used in our solution indirectly through `@dnd-kit` (`DndContext` provides drag state to all descendants). We considered using a custom Context for election data and block state, but decided against it:

- **Only one consumer**: `Blokkbygger` is the only component that needs both `parties` and `blocks`. Putting them in Context would add a Provider/Consumer pair for a single consumer — unnecessary abstraction.
- **Prop drilling is shallow**: The component tree is only 3 levels deep (`Blokkbygger → Block → PartyCard`). Props pass naturally without pain.
- **Embeddable isolation**: Each `mount()` call creates an independent React tree. Context is scoped to a tree by default, so multiple instances already get isolated state. Hooks with local state avoid shared-reference pitfalls.

If the component tree grew deeper or more components needed direct access to election data, introducing a `BlokkbyggerContext` would be the right next step.

### When would we reconsider?

| Scenario | Pattern to adopt |
|---|---|
| Multiple unrelated components need election data | Keep the hook — it's already reusable as-is |
| Host system needs to swap `PartyCard` for a custom renderer | Add a **component prop** or **render prop** to `Block` for the card renderer |
| Cross-cutting analytics/tracking on every interactive element | A **HOC** like `withTracking(PartyCard)` could make sense to avoid repetition |
| Deep component tree (5+ levels) needing shared state | Introduce a **React Context** provider at the `Blokkbygger` level |
| Multiple `mount()` instances need shared state (e.g., synced blocks) | External state manager (Zustand, or a shared Context above both trees) |
