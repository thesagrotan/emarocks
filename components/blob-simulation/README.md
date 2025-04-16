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

# Blob Simulation Initialization and Placement API

## Overview

This document describes the modularized blob initialization and placement systems that have been implemented as part of the Blob Simulation Project refactoring. These utilities provide a more maintainable, testable, and performant approach to creating and placing blobs in the simulation.

## Core Utilities and Hooks

### `initializeBlobs`

#### Purpose

Creates a new array of blob objects based on provided parameters while respecting various constraints like container boundaries, restricted areas, and blob spacing.

#### Signature

```typescript
function initializeBlobs(
  ctx: CanvasRenderingContext2D,
  params: SimulationParams,
  canvasSize: number,
  restrictedAreaParams: RestrictedAreaParams | undefined,
  letterDisplayColor: string
): Blob[]
```

#### Parameters

- `ctx`: Canvas 2D rendering context for drawing and checking collisions
- `params`: Simulation parameters including blob counts, sizes, and appearance settings
- `canvasSize`: Canvas dimensions (assuming square canvas)
- `restrictedAreaParams`: Parameters defining the restricted area/letter (if enabled)
- `letterDisplayColor`: Color of the letter in the current theme

#### Return Value

An array of initialized `Blob` objects positioned according to the constraints.

#### Example Usage

```typescript
// In a component or initialization function
const canvas = canvasRef.current;
const ctx = canvas.getContext("2d");
const letterColor = currentTheme === "dark" ? params.darkLetterColor : params.letterColor;
const restrictedArea = calculateRestrictedAreaParams(canvasWidth, canvasHeight);

// Create blobs using the utility
const blobs = initializeBlobs(
  ctx,
  simulationParams,
  canvasSize,
  restrictedArea,
  letterColor
);

// Use the created blobs
blobsRef.current = blobs;
draw();
```

### `useLetterAreaCalculation`

#### Purpose

A custom React hook that memoizes expensive letter area calculations to prevent unnecessary recalculations during re-renders.

#### Signature

```typescript
function useLetterAreaCalculation(
  restrictedAreaParams: RestrictedAreaParams | undefined,
  letterDisplayColor: string,
  canvasSize: number
): {
  letterArea: number;
  totalArea: number;
  letterAreaRatio: number;
  letterCenterX: number;
  letterCenterY: number;
}
```

#### Parameters

- `restrictedAreaParams`: Parameters defining the restricted area/letter
- `letterDisplayColor`: Color of the letter in the current theme
- `canvasSize`: Canvas dimensions

#### Return Value

An object containing:
- `letterArea`: Area covered by the letter in pixels
- `totalArea`: Total canvas area in pixels
- `letterAreaRatio`: Ratio of letter area to total area
- `letterCenterX`: X-coordinate of the letter's center
- `letterCenterY`: Y-coordinate of the letter's center

#### Example Usage

```typescript
// In a React functional component
const {
  letterArea,
  letterAreaRatio,
  letterCenterX,
  letterCenterY
} = useLetterAreaCalculation(
  restrictedAreaParams,
  colors.letterColor,
  canvasSize
);

// Use these values for blob distribution calculations
const insideLetterCount = Math.round(totalBlobCount * letterAreaRatio);
const outsideLetterCount = totalBlobCount - insideLetterCount;

// Or use them for visual debugging
console.log(`Letter covers ${(letterAreaRatio * 100).toFixed(1)}% of the canvas`);
```

## Implementation Notes

### Memoization Strategy

Both utility functions implement memoization to improve performance:

1. **React's `useMemo` Hook**: The `useLetterAreaCalculation` hook uses React's `useMemo` to cache calculations between renders, only recalculating when relevant dependencies change.

2. **Dependency List**: The calculation is only re-run when one of these parameters changes:
   - Letter character
   - Letter position (x, y)
   - Letter size
   - Font family
   - Letter color
   - Canvas size

### Blob Distribution Algorithm

The `initializeBlobs` utility implements a thoughtful distribution strategy:

1. **Area-Based Distribution**: Blobs are distributed proportionally based on the ratio of letter area to total canvas area.

2. **Collision Avoidance**: Each blob checks for:
   - Collisions with existing blobs (using `isOverlappingOtherBlobs`)
   - Position relative to the letter (using `isPointInLetter`)
   - Canvas boundaries and container margins

3. **Maximum Attempt Limiting**: The algorithm uses a maximum attempt count to prevent infinite loops when space is constrained.

4. **Post-Processing Filter**: After initial distribution, a final filter removes any blobs whose centers fall within the restricted area.

## Best Practices for Usage

- **Call During Initialization**: Use `initializeBlobs` during initial setup or when the simulation needs a complete restart.

- **Use with React Refs**: Store the resulting blob array in a ref (e.g., `blobsRef.current`) to maintain it across renders.

- **Canvas Context Requirement**: Always ensure you have a valid canvas context before calling these utilities.

- **Memoize Expensive Calculations**: Use `useLetterAreaCalculation` when you need letter metrics for additional calculations or visualizations.

- **Theme-Awareness**: Always pass the theme-appropriate letter color (using the current theme) to ensure correct collision detection.
