import { SimulationParams } from "@/components/blob-simulation/types";
import { logWarn } from "./logger"; // Import logger

/**
 * Converts a hexadecimal color string (3 or 6 digits, with or without #) to an RGBA color string.
 * Handles invalid input by returning transparent black ('rgba(0,0,0,0)') and logging a warning.
 *
 * @param {string} hex - The hexadecimal color string (e.g., "#FF0000", "f00", "ff0000").
 * @param {number} [alpha=1] - The alpha (opacity) value, ranging from 0 (transparent) to 1 (opaque). Defaults to 1.
 * @returns {string} The corresponding RGBA color string (e.g., "rgba(255, 0, 0, 1)"). Returns 'rgba(0,0,0,0)' for invalid input.
 */
export function hexToRgba(hex: string, alpha: number = 1): string {
  if (!hex) return 'rgba(0,0,0,0)'; // Handle empty or null input
    
  // Ensure hex code starts with #
  if (!hex.startsWith('#')) {
    hex = '#' + hex;
  }
  
  try {
    // Expand 3-digit hex to 6-digit
    if (hex.length === 4) {
      hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    }
    
    // Validate hex format
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      logWarn(`Invalid hex color provided to hexToRgba: ${hex}`, undefined, "hexToRgba"); // Replaced console.warn
      return 'rgba(0,0,0,0)';
    }
    
    hex = hex.replace(/^#/, '');
    const bigint = parseInt(hex, 16);
    
    if (isNaN(bigint)) {
      logWarn(`Could not parse hex color: ${hex}`, undefined, "hexToRgba"); // Replaced console.warn
      return 'rgba(0,0,0,0)';
    }
    
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch (error) {
    logWarn(`Error in hexToRgba for ${hex}: ${error}`, undefined, "hexToRgba"); // Replaced console.warn
    return 'rgba(0,0,0,0)';
  }
}

/**
 * Generates a set of points distributed pseudo-randomly using the Poisson Disk Sampling algorithm.
 * Ensures that no two points are closer than the specified minimum distance (`minDist`).
 * Can optionally avoid placing points within a defined rectangular restricted area.
 *
 * **Note:** The current implementation is a placeholder and needs the actual algorithm logic.
 *
 * @param {number} width - The width of the area for point generation.
 * @param {number} height - The height of the area for point generation.
 * @param {number} minDist - The minimum required distance between any two generated points.
 * @param {number} [k=30] - The number of candidate points to generate around an active point before rejecting it. Higher values increase density but slow down generation.
 * @param {number} [maxPoints] - An optional upper limit on the number of points to generate.
 * @param {object} [restrictedArea] - An optional rectangular area to exclude points from.
 * @param {number} [restrictedArea.x] - The x-coordinate of the top-left corner of the restricted area.
 * @param {number} [restrictedArea.y] - The y-coordinate of the top-left corner of the restricted area.
 * @param {number} [restrictedArea.size] - The width and height of the square restricted area.
 * @param {number} [restrictedArea.margin=0] - An additional margin around the restricted area to exclude points from.
 * @param {number} [minBlobSize] - (Currently unused in this placeholder) Minimum size of blobs, potentially for future density considerations.
 * @returns {Array<[number, number]>} An array of [x, y] coordinates representing the generated points. Returns an empty array in this placeholder implementation.
 */
export function poissonDiskSampling(
  width: number,
  height: number,
  minDist: number,
  k = 30,
  maxPoints?: number,
  restrictedArea?: { x: number; y: number; size: number; margin: number },
  minBlobSize?: number // Added optional minBlobSize, though not used in the copied logic directly here
): Array<[number, number]> {
  
  
  // Placeholder, replace this with actual logic for the function
  logWarn("poissonDiskSampling function is currently a placeholder and does not generate points.", undefined, "poissonDiskSampling");
  return []
}

/**
 * Determines the appropriate colors for various simulation elements based on the current theme ('light' or 'dark')
 * and the provided simulation parameters. Consolidates color selection logic.
 *
 * @param {SimulationParams} params - The object containing all simulation parameters, including color settings for both themes.
 * @param {string} theme - The current theme identifier, expected to be 'light' or 'dark'.
 * @returns {{
 *   backgroundColor: string;
 *   blobFill: string; // RGBA format, includes opacity
 *   blobBorder: string;
 *   letterColor: string;
 *   borderColor: string; // Color for the container border
 *   themeToggleBg: string;
 *   themeToggleIcon: string;
 * }} An object containing the calculated color values for the current theme.
 */
export function getSimulationColors(
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
} {
  const isDark = theme === 'dark';
  
  // Background color
  const backgroundColor = isDark
    ? params.darkBackgroundColor || '#1a2b2f'
    : params.backgroundColor || '#aac9ca';
  
  // Blob fill color with opacity
  const rawBlobFill = isDark
    ? params.darkBlobFillColor || '#000000'
    : params.blobFillColor || '#ffffff';
  const blobFillOpacity = isDark
    ? params.darkBlobFillOpacity || 0.3
    : params.blobFillOpacity || 0.3;
  const blobFill = hexToRgba(rawBlobFill, blobFillOpacity);
  
  // Blob border color
  const blobBorder = isDark
    ? params.darkBlobBorderColor || '#77e4cb'
    : params.blobBorderColor || '#466e91';
  
  // Letter color
  const letterColor = isDark
    ? params.darkLetterColor || '#FFFFFF'
    : params.letterColor || '#000000';
  
  // Border color for container (same as blob border if not specified)
  const borderColor = blobBorder;
  
  // Theme toggle button colors
  const themeToggleBg = isDark
    ? params.themeToggleBgColorDark || '#333333'
    : params.themeToggleBgColorLight || '#D3D3D3';
    
  const themeToggleIcon = isDark
    ? params.themeToggleIconColorDark || '#FFFFFF'
    : params.themeToggleIconColorLight || '#000000';
  
  return {
    backgroundColor,
    blobFill,
    blobBorder,
    letterColor,
    borderColor,
    themeToggleBg,
    themeToggleIcon,
  };
}
