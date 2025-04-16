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