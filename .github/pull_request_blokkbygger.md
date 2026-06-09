## 📝 Description

Implements the **Blokkbygger** component — an embeddable, drag-and-drop React widget for visualizing Norwegian parliamentary election coalitions. Users assign political parties into Venstre (left), Nøytral, and Høyre (right) blocks to explore government alternatives, powered by live-polled data from the NRK Valg 2025 API.

Built as a **library** with a framework-agnostic `mount()`/`unmount()` API, designed to be embedded into a host build system (not run as a standalone app).

## 🎯 What does this PR do?

- [x] Feature addition
- [ ] Bug fix
- [x] Documentation update
- [ ] Code refactoring
- [ ] Other: \***\*\_\*\***

## 🔍 Changes Made

### Core component library
- **`src/mount.ts`** — Public `mount(container, config)` API returning `update()`, `getState()`, and `unmount()` handles. React is hidden behind a plain JavaScript interface.
- **`src/components/Blokkbygger/`** — Six React components: `Blokkbygger` (root orchestrator), `Block` (droppable zone), `PartyCard` (draggable item), `MandateCounter` (block totals), `Header` (election stats dashboard), and `ErrorBanner` (conditional API error alert).
- **`src/hooks/useElectionData.ts`** — Custom hook for API fetching, polling (configurable interval), data transformation, and graceful error handling (last-good data persists on failure).
- **`src/hooks/useBlockState.ts`** — Custom hook managing party-to-block assignments with a predefined default distribution (left: R, SV, A, MDG; right: V, H, FRP, KRF; neutral: the rest).
- **`src/utils/`** — Pure utility functions for API data transformation, mandate summation, and Norwegian locale time formatting.
- **`src/config.ts`** — Centralized constants (API URL, poll interval, party groupings, drag thresholds) to eliminate magic numbers across the codebase.

### Drag and drop
- Integrated `@dnd-kit/core` and `@dnd-kit/sortable` for accessible drag-and-drop with `PointerSensor` (5px activation distance) and `KeyboardSensor` support.

### Styling
- CSS Modules for full style isolation in an embeddable context.
- Visual design matches the NRK Valg 2025 resultat page (light blue/white theme, dark navy header).
- 20+ CSS custom properties with `--bb-` prefix for host-side theming.

### Build configuration
- Vite configured for library mode (ESM + UMD output, React externalized as peer dependency, CSS not code-split).
- TypeScript strict mode with declaration generation.

### Testing (49 tests total)
- **Unit tests (Vitest)**: `transformApiData` (7 tests), `useElectionData` hook (14 tests) — covering data transformation, API fetch/poll lifecycle, error handling, data preservation, and cleanup.
- **Integration tests (Vitest)**: `ErrorHandling.test.tsx` (9 tests) — loading states, party rendering, ErrorBanner, graceful degradation, recovery, header stats.
- **E2E tests (Playwright)**: `blokkbygger.spec.ts` (19 tests) — full browser: component loading, header stats, default distribution, mandate counters, party cards, drag-and-drop interactions, and error handling with API route interception.
- **Test logger**: Custom `testLogger.ts` utility with ANSI-colored structured console output for readable CI logs.

### Documentation
- **`README.md`** — Prerequisites, setup, dev/build/test commands, host system usage with configuration table, project structure, scripts reference, and test summary.
- **`HIGH_ORDER_FUNCTIONALITY.md`** — 12-section technical document covering data flow, mount system, component hierarchy, development details, hooks, centralized config, data transformation, styling strategy, interaction model, error handling, architecture pattern rationale, and testing strategy.
- **`DEVELOPMENT_PLAN.md`** — Initial design document with architectural decisions and component breakdown.

## 🧪 Testing

- [x] I have tested this locally
- [x] All tests pass
- [x] No breaking changes

**Test commands:**
- `npm test` — runs 30 Vitest unit/integration tests
- `npm run test:e2e` — runs 19 Playwright E2E tests (Chromium)

## 📸 Screenshots (if applicable)

The component renders a dark navy header with election stats (Frammøte, Opptalt, Mandater, Flertall) and three columns (VENSTRE, NØYTRAL, HØYRE) on a light blue background. Each column contains draggable party cards showing party color, name, mandates, and vote percentage. A mandate counter at the bottom of each block shows the block total vs. election total (e.g., "79 / 169 mandater").

## 📋 Checklist

- [x] Code follows project style guidelines
- [x] Self-review completed
- [x] Code is commented where necessary
- [x] Documentation updated (if needed)

## 🚀 Deployment Notes

- The host system must provide **React 18 or 19** as a peer dependency — it is not bundled.
- Import the CSS file alongside the JS bundle: `import "@nrk/blokkbygger/style.css"`.
- The component polls `https://valg.nrk.no/api/2025/st` by default. Override with the `apiUrl` config option if a different endpoint is needed.
- No environment variables are required. All configuration is passed via the `mount()` options object.

## 📞 Additional Notes

- This is the initial feature branch (`feat/set-up`) containing the full implementation from scratch (45 files, ~7,800 lines).
- The component is designed for embeddability — `mount()` creates an isolated React root, and `unmount()` cleans up all side effects (polling timers, DOM nodes).
- The `dev/main.tsx` harness is excluded from the production build and is only used for local development.
