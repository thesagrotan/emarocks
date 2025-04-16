import { SimulationParams } from "@/components/blob-simulation/types"; 

/**
 * Converts a hexadecimal color code to an RGBA color string.
 *
 * @param {string} hex - The hexadecimal color code (e.g., "#FF0000" or "FF0000").
 * @param {number} [alpha=1] - The alpha (opacity) value, ranging from 0 to 1.
 * @returns {string} The RGBA color string (e.g., "rgba(255, 0, 0, 1)").
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
      console.warn(`Invalid hex color provided to hexToRgba: ${hex}`);
      return 'rgba(0,0,0,0)';
    }
    
    hex = hex.replace(/^#/, '');
    const bigint = parseInt(hex, 16);
    
    if (isNaN(bigint)) {
      console.warn(`Could not parse hex color: ${hex}`);
      return 'rgba(0,0,0,0)';
    }
    
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch (error) {
    console.warn(`Error in hexToRgba for ${hex}: ${error}`);
    return 'rgba(0,0,0,0)';
  }
}

/**
 * Generates a set of well-distributed random points using Poisson Disk Sampling.
 * This algorithm ensures that no two points are closer than a specified minimum distance.
 *
 * @param {number} width - The width of the area to generate points in.
 * @param {number} height - The height of the area to generate points in.
 * @param {number} minDist - The minimum distance between any two points.
 * @param {number} [k=30] - The number of attempts to find a valid point around a given sample.
 * @param {number} [maxPoints] - The maximum number of points to generate.
 * @param {object} [restrictedArea] - An optional restricted area object, in which no points will be generated.
 * @param {number} [restrictedArea.x] - The x-coordinate of the top-left corner of the restricted area.
 * @param {number} [restrictedArea.y] - The y-coordinate of the top-left corner of the restricted area.
 * @param {number} [restrictedArea.size] - The size (width and height) of the square restricted area.
 * @param {number} [restrictedArea.margin] - The margin around the restricted area where points will also be excluded.
 * @param {number} [minBlobSize] - Minimum size of the blob (not used in this implementation, but kept for compatibility).
 * @returns {Array<[number, number]>} An array of [x, y] coordinate pairs representing the generated points.
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
  return []
}

/**
 * Returns simulation colors based on the current theme and parameters
 * 
 * @param {SimulationParams} params - The simulation parameters including color settings
 * @param {string} theme - The current theme ('light' or 'dark')
 * @returns {Object} An object containing all theme-appropriate colors for the simulation
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
