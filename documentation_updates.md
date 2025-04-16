## `getSimulationColors` Utility Function

This utility function centralizes the theme-based color selection logic for the blob simulation.

**Location:** `shared/utils.ts`

**Function Signature:**
```
typescript
function getSimulationColors(
  params: SimulationParams,
  theme: 'light' | 'dark'
): {
  bg: string;
  fill: string;
  border: string;
  obstacle: string;
  obstacleText: string;
  themeToggleBg: string; // Added for theme toggle
  themeToggleIcon: string; // Added for theme toggle
}
```
**Parameters:**

*   `params`: An object containing the simulation parameters, including color settings for both light and dark themes. The `SimulationParams` interface in `components/blob-simulation/types.ts` has been updated to include the following properties:

    *   `themeToggleBgColorLight`: Background color for the theme toggle button in light mode.
    *   `themeToggleBgColorDark`: Background color for the theme toggle button in dark mode.
    *   `themeToggleIconColorLight`: Icon color for the theme toggle button in light mode.
    *   `themeToggleIconColorDark`: Icon color for the theme toggle button in dark mode.

*   `theme`: A string indicating the current theme, either `'light'` or `'dark'`.

**Return Value:**

An object containing the following color properties, based on the provided `theme` and values in the `params` object:

*   `bg`: Background color of the simulation canvas.
*   `fill`: Fill color of the blobs.
*   `border`: Border color of the blobs and container.
*   `obstacle`: Color of the restricted area letter.
*   `obstacleText`: Color of the text within obstacles (if applicable). Note: This might be redundant with `obstacle` and could be reviewed for removal.
*   `themeToggleBg`: Background color for the theme toggle button.
*   `themeToggleIcon`: Icon color for the theme toggle button.

**Usage:**

The `getSimulationColors` function is used within the `BlobSimulation` component to determine the appropriate colors for rendering the simulation based on the current theme and user-configurable parameters. It is also used in the `downloadSVG` function to ensure the SVG output matches the current theme.

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