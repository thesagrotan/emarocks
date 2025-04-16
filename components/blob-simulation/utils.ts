import { Vector2 } from 'three';
import { Blob as SimBlob } from './blob';
import { hexToRgba, poissonDiskSampling } from "@/shared/utils";
import { 
  formatFontFamily, 
  getLetterVisualBounds as getLetterVisualBoundsBase,
  createFontString,
  clearLetterCache
} from "@/shared/font-utils";
// Simulation utilities

/**
 * Calculates the visual baseline offset for centering a letter within a canvas.
 * @deprecated Use the centralized version from shared/font-utils.ts instead
 */
export function getLetterVisualBounds(letter: string, size: number, font: string): { baseline: number } {
  // Forward to the centralized implementation for compatibility with existing code
  const result = getLetterVisualBoundsBase(letter, size, font);
  return { baseline: result.baseline };
}

// formatFontFamily is now imported from shared/font-utils.ts

/**
 * Draw letter on canvas context
 */
export function drawLetter(
  ctx: CanvasRenderingContext2D, 
  letter: string, 
  x: number, 
  y: number, 
  size: number, 
  color: string = "white",
  fontFamily?: string
) {
  // Save the current context state
  ctx.save();
  // Get visual bounds for true centering
  const font = createFontString(size, fontFamily); // Using centralized font string creation
  const { baseline } = getLetterVisualBoundsBase(letter, size, font);
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  // Apply baseline offset to y for true visual centering
  ctx.fillText(letter, x, y + baseline);
  ctx.restore();
}

// Cache for letter shapes to avoid recreating canvases
export const letterShapeCache: Map<string, {
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  imageData: ImageData
}> = new Map();

/**
 * Check if a point is inside the path of a letter
 */
export function isPointInLetter(
  ctx: CanvasRenderingContext2D,
  letter: string,
  letterX: number,
  letterY: number,
  letterSize: number,
  pointX: number,
  pointY: number,
  color: string = "black", // Add color parameter
  fontFamily?: string
): boolean {
  // Create a unique cache key based on the letter, size and color
  const cacheKey = `${letter}-${letterSize}-${color}-${fontFamily || "Arial"}`;
  
  // Check if we already have this letter cached
  let letterData = letterShapeCache.get(cacheKey);
  
  if (!letterData) {
    // Create a new cache entry for this letter and size
    const offscreen = document.createElement('canvas');
    const w = Math.max(letterSize * 2, 200);
    const h = Math.max(letterSize * 2, 200);
    offscreen.width = w;
    offscreen.height = h;
    
    const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!offCtx) return false;
    
    // Clear canvas with white background for collision detection
    offCtx.fillStyle = 'white';
    offCtx.fillRect(0, 0, w, h);
    
    // Draw the letter in specified color, baseline centered
    const font = createFontString(letterSize, fontFamily); 
    const { baseline } = getLetterVisualBoundsBase(letter, letterSize, font);
    offCtx.fillStyle = color;
    offCtx.font = font;
    offCtx.textAlign = "center";
    offCtx.textBaseline = "middle";
    offCtx.fillText(letter, w/2, h/2 + baseline);
    
    // Cache the letter data
    const imageData = offCtx.getImageData(0, 0, w, h);
    letterData = { canvas: offscreen, ctx: offCtx, imageData };
    letterShapeCache.set(cacheKey, letterData);
  }
  
  // Transform point to offscreen canvas coordinates
  const w = letterData.canvas.width;
  const h = letterData.canvas.height;
  const offsetX = w/2 - letterX;
  const offsetY = h/2 - letterY;
  const testX = Math.round(pointX + offsetX);
  const testY = Math.round(pointY + offsetY);
  
  // Check bounds
  if (testX < 0 || testX >= w || testY < 0 || testY >= h) {
    return false;
  }
  
  // Get pixel value from cached image data
  const pixelIndex = (testY * w + testX) * 4;
  const r = letterData.imageData.data[pixelIndex];
  const g = letterData.imageData.data[pixelIndex + 1];
  const b = letterData.imageData.data[pixelIndex + 2];
  
  // If pixel is dark, it's part of the letter (collision detection)
  return r < 200 && g < 200 && b < 200;
}

export function createLetterPath(ctx: CanvasRenderingContext2D, letter: string, size: number, fontFamily?: string) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const tempCtx = canvas.getContext('2d');
  
  if (!tempCtx) {
    console.warn('Canvas 2D context not available for createLetterPath');
    return {
      canvas,
      ctx: ctx,
      imageData: new ImageData(1, 1)
    };
  }
  
  const font = createFontString(size, fontFamily);
  const { baseline } = getLetterVisualBoundsBase(letter, size, font);
  tempCtx.font = font;
  tempCtx.textAlign = "center";
  tempCtx.textBaseline = "middle";
  tempCtx.fillText(letter, size/2, size/2 + baseline);
  
  return {
    canvas,
    ctx: tempCtx,
    imageData: tempCtx.getImageData(0, 0, size, size)
  };
}

export interface Region {
  type: 'outer' | 'hole';
  center: { x: number; y: number };
  points: { x: number; y: number }[];
}

export function analyzeLetter(
  ctx: CanvasRenderingContext2D,
  letter: string,
  letterX: number,
  letterY: number,
  letterSize: number
): Region[] {
  const letterData = createLetterPath(ctx, letter, letterSize);
  const regions: Region[] = [];
  const visited = new Set<string>();
  const imgData = letterData.imageData;
  const width = letterData.canvas.width;
  const height = letterData.canvas.height;

  // Helper to check if a point is inside the letter
  const isBlack = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    const i = (y * width + x) * 4;
    return imgData.data[i] < 200;
  };

  // Flood fill to find connected regions
  const floodFill = (startX: number, startY: number, isHole: boolean): Region => {
    const points: { x: number; y: number }[] = [];
    const queue: [number, number][] = [[startX, startY]];
    let sumX = 0, sumY = 0;

    while (queue.length > 0) {
      const [x, y] = queue.pop()!;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      visited.add(key);

      const isCurrentBlack = isBlack(x, y);
      if (isHole ? isCurrentBlack : !isCurrentBlack) continue;

      points.push({ x, y });
      sumX += x;
      sumY += y;

      // Check neighbors
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          queue.push([nx, ny]);
        }
      });
    }

    return {
      type: isHole ? 'hole' : 'outer',
      center: {
        x: (sumX / points.length - width/2) + letterX,
        y: (sumY / points.length - height/2) + letterY
      },
      points: points.map(p => ({
        x: (p.x - width/2) + letterX,
        y: (p.y - height/2) + letterY
      }))
    };
  };

  // Find outer region first
  regions.push(floodFill(0, 0, false));

  // Find holes by scanning for black pixels next to white ones
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (isBlack(x, y) && !isBlack(x+1, y)) {
        // Found potential hole entrance
        const nextX = x + 2;
        const key = `${nextX},${y}`;
        if (!visited.has(key) && !isBlack(nextX, y)) {
          regions.push(floodFill(nextX, y, true));
        }
      }
    }
  }

  // Cleanup
  letterData.canvas.width = 1;
  letterData.canvas.height = 1;

  return regions;
}

export function calculateRegionDensity(
  ctx: CanvasRenderingContext2D,
  blobs: SimBlob[],
  letter: string,
  letterX: number,
  letterY: number,
  letterSize: number,
  canvasWidth: number,
  canvasHeight: number,
  letterColor: string = "black"
): { insideDensity: number; outsideDensity: number } {
  let insideParticles = 0;
  let outsideParticles = 0;
  let insideArea = 0;
  let outsideArea = canvasWidth * canvasHeight;

  // Calculate letter area
  const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
  const pixels = imageData.data;
  let letterPixels = 0;

  // Draw letter temporarily to calculate its area using the current color
  ctx.save();
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  drawLetter(ctx, letter, letterX, letterY, letterSize, letterColor);
  
  // Count letter pixels
  const tempImageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
  for (let i = 0; i < tempImageData.data.length; i += 4) {
    // Check if any color channel has content
    if (tempImageData.data[i] > 0 || tempImageData.data[i + 1] > 0 || tempImageData.data[i + 2] > 0) {
      letterPixels++;
    }
  }
  
  ctx.restore();

  insideArea = (letterPixels / (canvasWidth * canvasHeight)) * (canvasWidth * canvasHeight);
  outsideArea = (canvasWidth * canvasHeight) - insideArea;

  // Count particles in each region
  blobs.forEach(blob => {
    blob.particles.forEach(particle => {
      if (isPointInLetter(ctx, letter, letterX, letterY, letterSize, particle.pos.x, particle.pos.y, letterColor)) {
        insideParticles++;
      } else {
        outsideParticles++;
      }
    });
  });

  return {
    insideDensity: insideParticles / insideArea,
    outsideDensity: outsideParticles / outsideArea
  };
}

export function findOptimalBlobPlacement(
  ctx: CanvasRenderingContext2D,
  blobs: SimBlob[],
  letter: string,
  letterX: number,
  letterY: number,
  letterSize: number,
  canvasWidth: number,
  canvasHeight: number,
  margin: number,
  letterColor: string = "black"
): { x: number; y: number } {
  const { insideDensity, outsideDensity } = calculateRegionDensity(
    ctx, blobs, letter, letterX, letterY, letterSize, canvasWidth, canvasHeight, letterColor
  );

  let attempts = 0;
  const maxAttempts = 50;
  
  while (attempts < maxAttempts) {
    const x = margin + Math.random() * (canvasWidth - 2 * margin);
    const y = margin + Math.random() * (canvasHeight - 2 * margin);
    
    const isInside = isPointInLetter(ctx, letter, letterX, letterY, letterSize, x, y, letterColor);
    
    // Place in the region with lower density
    if ((isInside && insideDensity <= outsideDensity) || 
        (!isInside && outsideDensity <= insideDensity)) {
      return { x, y };
    }
    
    attempts++;
  }
  
  // Fallback to random position if no optimal spot found
  return {
    x: margin + Math.random() * (canvasWidth - 2 * margin),
    y: margin + Math.random() * (canvasHeight - 2 * margin)
  };
}

export function isOverlappingOtherBlobs(x: number, y: number, blobs: SimBlob[], minBlobSize: number, repelDistance: number): boolean {
  return blobs.some(blob => {
    if (!blob || !blob.centre) return false;
    const distSq = Math.pow(blob.centre.x - x, 2) + Math.pow(blob.centre.y - y, 2);
    const minAllowedDistSq = Math.pow(blob.maxRadius + minBlobSize + repelDistance , 2);
    return distSq < minAllowedDistSq;
  });
}

