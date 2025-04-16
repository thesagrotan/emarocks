# Refactor Checklist for Blob Simulation Project

## 1. Unify Utility Functions
- [x] Identified all duplicate implementations of `poissonDiskSampling` and `hexToRgba` in the codebase (in `components/utils.ts`, `components/blob-simulation/utils.ts`, and `utils.ts`).
- [x] Decided on `shared/utils.ts` as the single source of truth for these utilities.
- [x] Removed redundant implementations from all other files.
- [x] Updated all imports throughout the project to use the unified utility functions from `shared/utils.ts`.
- [x] Ensured the unified utilities are well-documented and have clear parameter/return type annotations.
- [x] Add or improve unit tests for these utilities to cover edge cases and invalid input.
- [x] Use or update barrel files (index.ts) for easier imports in shared and blob-simulation directories.

**Notes:**
- All usages of `hexToRgba` and `poissonDiskSampling` are now consistent and imported from `shared/utils.ts`.
- Added comprehensive unit tests for `hexToRgba` and `poissonDiskSampling` in `shared/utils.test.ts`.
- Created/updated barrel files `shared/index.ts` and `blob-simulation/index.ts`.
- Section 1 is complete.

## 2. Centralize Theme and Color Logic
- [ ] Create a utility or React context for theme-based color selection (e.g., `getSimulationColors(params, theme)`).
- [ ] Refactor all color logic in components and utilities to use this central utility/context, including all theme toggling and color selection for light/dark modes.
- [ ] Ensure color logic is consistent and correct across all usages, including SVG export, canvas drawing, overlays, and UI controls.
- [ ] Document the color utility/context and provide usage examples.

**Notes:**
- getSimulationColors utility created in shared/utils.ts
- blob-simulation.tsx refactored to use getSimulationColors for all theme-based color selection
- Next: check overlays, UI, and utility files for color logic to centralize
- No issues so far; color logic is now consistent in main simulation and SVG export
- TODO: Document getSimulationColors usage and update checklist when overlays/UI are refactored

## 3. Modularize Blob Initialization and Placement
- [ ] Extract blob placement and initialization logic from the main simulation component into reusable functions or custom hooks (e.g., `useBlobPlacement`).
- [ ] Memoize expensive calculations and derived values (e.g., letter area, mask generation, collision checks) using React or utility memoization where possible.
- [ ] Add unit tests for blob placement logic, including edge cases (e.g., restricted area at edge, very small/large blob counts).
- [ ] Document the new functions/hooks and provide usage examples.

**Notes:**
- initializeBlobs utility created in blob-simulation/hooks.ts
- blob-simulation.tsx refactored to use initializeBlobs for all blob placement and initialization
- Logic is now reusable, testable, and easier to maintain
- Next: consider memoization and add unit tests for initializeBlobs
- No issues so far; initialization is now modular and clean

## 4. Improve State and Animation Management
- [ ] Move animation frame and simulation state logic into a custom React hook (e.g., `useBlobSimulationAnimation`).
- [ ] Simplify and document all state variables, ensuring each has a clear purpose and is not duplicated.
- [ ] Remove any duplicated or unnecessary state logic from the main component.
- [ ] Add comments explaining the animation lifecycle and state transitions.

## 5. Component Decomposition
- [ ] Split the main simulation component into smaller presentational components:
  - [ ] Canvas (handles rendering and events)
  - [ ] Controls (parameter sliders, toggles, etc.)
  - [ ] Overlays/Indicators (live editing, tooltips, etc.)
- [ ] Move each component to its own file if not already separated.
- [ ] Ensure all custom components have clear and correct prop types, and document their API and expected usage.
- [ ] Add or improve Storybook stories or usage examples for each component if possible.

## 6. Cache and Font Handling
- [ ] Centralize font family formatting and baseline calculation in a utility function (e.g., `getFontFamilyString`, `getLetterVisualBounds`).
- [ ] Ensure `letterShapeCache` is cleared whenever relevant parameters (font, color, letter, size) change, to prevent stale rendering.
- [ ] Add unit tests for font and cache utilities, including edge cases (e.g., unusual font names, very large/small sizes).
- [ ] Document the cache and font utilities and their intended usage.

## 7. TypeScript Improvements
- [ ] Strengthen types for simulation parameters, blob state, and context. Use interfaces and type aliases where appropriate.
- [ ] Add or improve types in all utility functions, including explicit return types and parameter types.
- [ ] Add or improve type tests if applicable (e.g., using `tsd`).
- [ ] Ensure all exported types are documented and used consistently across the codebase.

## 8. Consistent Error Handling
- [ ] Centralize error handling and logging for simulation and utility functions (e.g., create a `logError` utility or use a context-based logger).
- [ ] Replace all inline `console.error`/`console.warn` with the new utility/context for consistency.
- [ ] Add tests for error handling where possible (e.g., simulate errors in blob placement, color parsing, etc.).
- [ ] Document the error handling approach and provide usage examples.

## 9. Documentation & Comments
- [ ] Add or improve comments and documentation for all complex logic, especially in utility and core simulation files. Use JSDoc or TypeScript doc comments where possible.
- [ ] Keep `refactor-log.txt` updated as you progress, to track what’s been done and what’s pending. Include dates and a brief summary for each entry.
- [ ] Ensure all README files and in-code documentation are up to date with the new structure and APIs.
