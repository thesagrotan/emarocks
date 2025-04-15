# Blob Simulation

This directory contains the main logic and components for the soft blob physics simulation.

## Structure

- `blob.ts`: Blob class and logic
- `simulation-controls.tsx`: UI controls for simulation parameters
- `utils.ts`: Utility functions (some moved to `/shared/utils.ts`)
- `types.ts`: TypeScript types for simulation
- `context.ts`: React context for simulation parameters
- `hooks.ts`: Custom hooks for simulation context

## Usage

Import from the barrel file for convenience:

```ts
import { Blob, SimulationControls, useSimulationParams } from "@/components/blob-simulation"
```
