/**
 * Font utility functions for consistent font formatting and rendering
 * These utilities handle font family formatting, baseline calculations,
 * and other font-related operations used in the blob simulation
 */

/**
 * Formats a font family name for use in CSS/Canvas contexts
 * Adds quotes around font names with spaces as required by CSS
 * 
 * @param {string} [fontFamily] - The font family name to format, defaults to Arial if not provided
 * @returns {string} Properly formatted font family string
 */
export function formatFontFamily(fontFamily?: string): string {
  if (!fontFamily) return "Arial";
  return fontFamily.includes(" ") ? `"${fontFamily}"` : fontFamily;
}

/**
 * Calculates the visual baseline offset for centering a letter within a canvas.
 * This is critical for proper vertical text alignment in canvas rendering.
 *
 * @param {string} letter - The letter to measure
 * @param {number} size - The font size of the letter in pixels
 * @param {string} font - The complete font string (e.g. "bold 24px Arial")
 * @returns {{ 
 *   baseline: number,
 *   metrics?: TextMetrics
 * }} An object containing the baseline offset and optional text metrics
 */
export function getLetterVisualBounds(
  letter: string, 
  size: number, 
  font: string
): { baseline: number; metrics?: TextMetrics } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    console.warn('Canvas 2D context not available for text measurement');
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
    console.warn(`Error measuring text "${letter}" with font "${font}":`, error);
    return { baseline: 0 };
  } finally {
    // Clean up the temporary canvas element
    canvas.width = 1;
    canvas.height = 1;
  }
}

/**
 * Creates a complete font string for use with Canvas API
 * 
 * @param {number} size - Font size in pixels
 * @param {string} [fontFamily] - Font family name
 * @param {string} [weight] - Font weight (normal, bold, etc.)
 * @param {string} [style] - Font style (normal, italic, etc.)
 * @returns {string} Complete font string for Canvas API
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
 * Clear the letter shape cache when font parameters change
 * 
 * @param {object} cacheMap - The cache Map object to clear
 */
export function clearLetterCache(cacheMap: Map<string, any>): void {
  if (cacheMap && cacheMap instanceof Map) {
    cacheMap.clear();
  }
}

/**
 * Detect if a font is available in the browser
 * 
 * @param {string} fontFamily - The font family to check
 * @returns {boolean} Whether the font is available
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