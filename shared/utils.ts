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
    hex = hex.replace(/^#/, '');
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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


export function getSimulationColors(
  params: any,
  theme: string
): { backgroundColor: string; blobFill: string; letterColor: string; restrictedAreaColor: string; borderColor: string } {
  let backgroundColor: string;
  let blobFill: string;
  let letterColor: string;
  let borderColor: string;
  let blobFillOpacity: number;

  if (theme === 'dark') {
    backgroundColor = params.darkBackgroundColor || '#121212';
    blobFill = params.darkBlobFillColor || '#00FFFF';
    letterColor = params.darkLetterColor || '#FFFFFF';
    borderColor = params.darkBlobBorderColor || '#77e4cb';
    blobFillOpacity = params.darkBlobFillOpacity;
  } else {
    backgroundColor = params.backgroundColor || '#FFFFFF';
    blobFill = params.blobFillColor || '#0000FF';
    letterColor = params.letterColor || '#000000';
    borderColor = params.blobBorderColor || '#466e91';
    blobFillOpacity = params.blobFillOpacity;
  }

  const rgbaBlobFill = hexToRgba(blobFill, blobFillOpacity);
  const restrictedAreaColor = hexToRgba(theme === 'dark' ? '#00FFFF' : '#0000FF', 0.1)
  return { backgroundColor, blobFill: rgbaBlobFill, letterColor, restrictedAreaColor, borderColor };
}
