## `getSimulationColors` Utility Function

The `getSimulationColors` utility function centralizes all theme-based color selection for the Blob Simulation project. It ensures consistent color handling across all components and features, including canvas rendering, SVG export, and UI controls.

### Function Signature

```typescript
function getSimulationColors(
  params: SimulationParams,
  theme: string
): {
  backgroundColor: string;
  blobFill: string;
  blobBorder: string;
  letterColor: string;
  borderColor: string;
  themeToggleBg: string;
  themeToggleIcon: string;
}
```

### Parameters

- `params`: The simulation parameters object containing all color-related settings
- `theme`: The current theme ('light' or 'dark')

### Return Value

An object containing all theme-appropriate colors for the simulation:

- `backgroundColor`: Background color for the simulation canvas
- `blobFill`: Fill color for blobs (with opacity already applied)
- `blobBorder`: Border color for blobs
- `letterColor`: Color for the restricted area letter
- `borderColor`: Border color for the container
- `themeToggleBg`: Background color for the theme toggle button
- `themeToggleIcon`: Icon color for the theme toggle button

### Usage Examples

#### In BlobSimulation.tsx

```typescript
// Get theme-appropriate colors for the current theme
const colors = getSimulationColors(simulationParams, currentTheme);

// Use the returned colors for canvas drawing
ctx.fillStyle = colors.backgroundColor;
ctx.fillRect(0, 0, canvasWidth, canvasHeight);

// Use colors for SVG export
const svgContent = `<svg style="background-color: ${colors.backgroundColor};">...</svg>`;
```

#### In ThemeToggle.tsx

```typescript
// Create minimal params with just theme toggle properties
const themeParams: Partial<SimulationParams> = {
  themeToggleBgColorLight: bgColorLight,
  themeToggleBgColorDark: bgColorDark,
  themeToggleIconColorLight: iconColorLight,
  themeToggleIconColorDark: iconColorDark,
};

// Get theme-appropriate colors from the utility
const colors = getSimulationColors(themeParams as SimulationParams, theme || 'light');

// Use the colors returned from the utility
const buttonBg = colors.themeToggleBg;
const iconColor = colors.themeToggleIcon;
```

### Implementation Notes

- The function handles opacity for blob fill colors by using the `hexToRgba` utility
- Default fallback colors are provided for each property in case they're missing from params
- The utility ensures consistent color handling regardless of theme changes

## Updated `BlobSimulation` Component

The `BlobSimulation` component (`components/blob-simulation.tsx`) has been updated to:

*   Include the new theme toggle color parameters (`themeToggleBgColorLight`, `themeToggleBgColorDark`, `themeToggleIconColorLight`, and `themeToggleIconColorDark`) in its `simulationParams` state, with default values.
*   Pass these new parameters to the `SimulationControls` component.
*   Utilize the `themeToggleBg` and `themeToggleIcon` properties returned by `getSimulationColors` (indirectly, through the `SimulationControls` and `ThemeToggle` components).

## Updated `SimulationControls` Component

The `SimulationControls` component (`components/blob-simulation/simulation-controls.tsx`) has been updated to:

*   Import and render the `ThemeToggle` component.
*   Pass the theme toggle color parameters received from `BlobSimulation` as props to the `ThemeToggle` component.
*   Remove the duplicate theme toggle button that was previously present in this component.

## Updated `ThemeToggle` Component

The `ThemeToggle` component (`components/theme-toggle.tsx`) has been updated to:

*   Accept the following props for styling: `bgColorLight`, `bgColorDark`, `iconColorLight`, and `iconColorDark`.
*   Use these props to set the background and icon colors of the theme toggle button, instead of relying on inline styles.
*   Remove the `fixed` positioning and adjust margins/padding to ensure proper layout within the `SimulationControls` panel.

# Font Utilities Documentation

## Overview

The font utilities in `shared/font-utils.ts` provide centralized functions for font handling, baseline calculation, and cache management used throughout the blob simulation. These utilities ensure consistent font rendering across the application and optimize performance through caching and proper cache invalidation.

## Key Components

### Font Formatting and String Creation

#### `formatFontFamily(fontFamily?: string): string`

Properly formats font family names for use in CSS and Canvas contexts.

- Adds quotes around font names with spaces as required by CSS spec
- Provides a default fallback ("Arial") if no font is specified
- Example: `"Times New Roman"` vs `Arial`

```typescript
// Usage examples
const font1 = formatFontFamily('Arial'); // Returns: "Arial"
const font2 = formatFontFamily('Times New Roman'); // Returns: "\"Times New Roman\""
const font3 = formatFontFamily(); // Returns: "Arial" (default fallback)
```

#### `createFontString(size: number, fontFamily?: string, weight: string = 'bold', style: string = 'normal'): string`

Creates a complete font string for use with Canvas API.

- Combines size, family, weight, and style into a single string
- Handles proper formatting of font family names with spaces
- Provides sensible defaults for optional parameters

```typescript
// Usage examples
const font1 = createFontString(16); // Returns: "bold normal 16px Arial"
const font2 = createFontString(24, 'Helvetica', 'normal', 'italic'); 
// Returns: "normal italic 24px Helvetica"
```

### Text Measurement and Rendering

#### `getLetterVisualBounds(letter: string, size: number, font: string): { baseline: number; metrics?: TextMetrics }`

Calculates the visual baseline offset for proper vertical text centering in canvas.

- Creates a temporary canvas to measure text dimensions
- Calculates the baseline offset needed for visual centering
- Returns both baseline and optional TextMetrics object
- Handles errors gracefully with appropriate console warnings

```typescript
// Usage example
const { baseline, metrics } = getLetterVisualBounds('A', 32, 'bold 32px Arial');
ctx.fillText(letter, x, y + baseline); // Apply baseline for true centering
```

### Cache Management

#### `clearLetterCache(cacheMap: Map<string, any>): void`

Clears the letter shape cache to prevent stale rendering.

- Safely clears a Map object used for caching letter shapes
- Handles invalid inputs gracefully (null, undefined, non-Map objects)
- Should be called when font parameters change

```typescript
// Usage example
import { letterShapeCache } from './utils';
import { clearLetterCache } from '@/shared/font-utils';

// Clear cache when parameters change
clearLetterCache(letterShapeCache);
```

#### React Hook: `useLetterCacheInvalidation`

Custom React hook that manages letter shape cache invalidation when font parameters change.

- Watches for changes to relevant parameters (letter, font, color, size)
- Automatically clears the cache when any parameter changes
- Prevents stale rendering and visual artifacts

```typescript
// Usage example in a React component
useLetterCacheInvalidation(
  {
    restrictedAreaLetter: params.restrictedAreaLetter,
    fontFamily: params.fontFamily,
    letterColor: params.letterColor,
    darkLetterColor: params.darkLetterColor,
    restrictedAreaSize: params.restrictedAreaSize
  },
  currentTheme
);
```

### Font Detection

#### `isFontAvailable(fontFamily: string): boolean`

Detects if a specific font is available in the browser.

- Creates a temporary canvas to compare text widths with different fonts
- Returns true if the requested font appears to be available
- Useful for providing fallbacks when specific fonts aren't available

```typescript
// Usage example
if (isFontAvailable('Comic Sans MS')) {
  // Use the font
} else {
  // Fall back to a more common font
}
```

## Best Practices

1. **Always use the centralized utilities**: Import font utilities from `@/shared/font-utils` rather than implementing custom logic.

2. **Clear the cache when parameters change**: Use `useLetterCacheInvalidation` hook in React components or call `clearLetterCache` directly when changing:
   - Font family
   - Letter character
   - Font size
   - Letter color

3. **Handle errors gracefully**: All utilities have built-in error handling, but you should still implement appropriate fallbacks in your code.

4. **Be mindful of performance**: Text measurement and rendering are expensive operations. Use caching where appropriate and avoid unnecessary recalculations.

## Implementation Example

```typescript
import { 
  formatFontFamily, 
  createFontString, 
  getLetterVisualBounds,
  clearLetterCache,
  useLetterCacheInvalidation
} from '@/shared/font-utils';

// In a React component
function LetterRenderer({ letter, size, fontFamily, color, theme }) {
  const canvasRef = useRef(null);
  
  // Automatically invalidate cache when parameters change
  useLetterCacheInvalidation(
    { 
      restrictedAreaLetter: letter,
      fontFamily,
      letterColor: theme === 'light' ? color : darkColor,
      darkLetterColor: darkColor,
      restrictedAreaSize: size
    },
    theme
  );
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Create properly formatted font string
    const fontString = createFontString(size, fontFamily);
    
    // Get baseline for visual centering
    const { baseline } = getLetterVisualBounds(letter, size, fontString);
    
    // Draw the letter with proper centering
    ctx.font = fontString;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, canvas.width/2, canvas.height/2 + baseline);
  }, [letter, size, fontFamily, color]);
  
  return <canvas ref={canvasRef} width={size} height={size} />;
}
```