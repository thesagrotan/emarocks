import { logWarn } from "./logger"; // Import logger

/**
 * Provides utility functions for handling font-related tasks in the simulation,
 * such as formatting font family names, calculating text metrics for centering,
 * creating font strings for the Canvas API, managing caches, and checking font availability.
 */

/**
 * Formats a font family name for safe use in CSS font properties or Canvas `ctx.font`.
 * Ensures that font names containing spaces are enclosed in double quotes.
 * Defaults to "Arial" if no font family is provided or if the input is empty.
 *
 * @param {string} [fontFamily] - The font family name (e.g., "Arial", "Times New Roman").
 * @returns {string} The formatted font family name, quoted if necessary (e.g., "Arial", "\"Times New Roman\"").
 */
export function formatFontFamily(fontFamily?: string): string {
  if (!fontFamily) return "Arial";
  return fontFamily.includes(" ") ? `"${fontFamily}"` : fontFamily;
}

/**
 * Calculates the visual vertical baseline offset required to center a given letter
 * within a specific font size and style using the Canvas API's text metrics.
 * This helps in achieving visually centered text rendering on the canvas.
 *
 * @param {string} letter - The single character to measure.
 * @param {number} size - The font size in pixels.
 * @param {string} font - The complete CSS font string (e.g., "bold 32px Arial", "italic 16px \"Times New Roman\"").
 * @returns {{
 *   baseline: number; // The calculated vertical offset from the standard baseline for centering.
 *   metrics?: TextMetrics; // Optional: The raw TextMetrics object returned by the Canvas API.
 * }} An object containing the baseline offset. Returns { baseline: 0 } if measurement fails.
 */
export function getLetterVisualBounds(
  letter: string, 
  size: number, 
  font: string
): { baseline: number; metrics?: TextMetrics } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    logWarn('Canvas 2D context not available for text measurement', undefined, 'getLetterVisualBounds'); // Replaced console.warn
    return { baseline: 0 };
  }
  
  try {
    ctx.font = font;
    const metrics = ctx.measureText(letter);
    
    // Calculate baseline for vertical centering
    // This positions the text visually in the middle rather than by its bounding box
    const baseline = (metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent) / 2 - metrics.fontBoundingBoxAscent;
    
    return { baseline, metrics };
  } catch (error) {
    logWarn(`Error measuring text "${letter}" with font "${font}":`, error, 'getLetterVisualBounds'); // Replaced console.warn
    return { baseline: 0 };
  } finally {
    // Clean up the temporary canvas element
    canvas.width = 1;
    canvas.height = 1;
  }
}

/**
 * Constructs a complete font string suitable for use with the Canvas `ctx.font` property.
 * Combines font style, weight, size, and family into a single string.
 * Uses `formatFontFamily` to ensure the family name is correctly quoted if needed.
 *
 * @param {number} size - The desired font size in pixels.
 * @param {string} [fontFamily] - The font family name. Defaults to "Arial" via `formatFontFamily`.
 * @param {string} [weight='bold'] - The desired font weight (e.g., 'normal', 'bold', 'lighter'). Defaults to 'bold'.
 * @param {string} [style='normal'] - The desired font style (e.g., 'normal', 'italic', 'oblique'). Defaults to 'normal'.
 * @returns {string} A complete font string (e.g., "bold normal 16px Arial", "normal italic 24px \"Times New Roman\"").
 */
export function createFontString(
  size: number,
  fontFamily?: string,
  weight: string = 'bold',
  style: string = 'normal'
): string {
  return `${weight} ${style} ${size}px ${formatFontFamily(fontFamily)}`;
}

/**
 * Clears all entries from a given Map object, typically used for clearing caches.
 * Performs a check to ensure the provided argument is actually a Map before attempting to clear.
 *
 * @param {Map<string, any>} cacheMap - The Map object instance to clear.
 * @returns {void}
 */
export function clearLetterCache(cacheMap: Map<string, any>): void {
  if (cacheMap && cacheMap instanceof Map) {
    cacheMap.clear();
  }
}

/**
 * Attempts to detect if a given font family is available in the user's browser.
 * Works by comparing the measured width of a test string rendered with the target font
 * against the width rendered with a known base font (e.g., sans-serif). If the widths
 * differ, the target font is assumed to be available.
 *
 * **Note:** This method is not foolproof and relies on browser rendering behavior.
 *
 * @param {string} fontFamily - The font family name to check for availability.
 * @returns {boolean} `true` if the font is likely available, `false` otherwise or if detection fails.
 */
export function isFontAvailable(fontFamily: string): boolean {
  // Base fonts that are almost always available
  const baseFonts = ['Arial', 'sans-serif'];
  
  // Create a canvas to test text width with different fonts
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return false;
  
  const testString = 'mmmmmmmmmmlli';
  const testSize = '72px';
  
  // Get width with base font
  ctx.font = `${testSize} ${baseFonts[0]}`;
  const baseWidth = ctx.measureText(testString).width;
  
  // Try with requested font
  try {
    ctx.font = `${testSize} ${formatFontFamily(fontFamily)}, ${baseFonts[0]}`;
    const testWidth = ctx.measureText(testString).width;
    
    // If widths are different, the font is likely available
    return testWidth !== baseWidth;
  } catch (e) {
    return false;
  } finally {
    // Clean up
    canvas.width = 1;
    canvas.height = 1;
  }
}