import { Vector2 } from 'three';
import { Blob as SimBlob } from './blob';  // Rename import to avoid conflict with browser's Blob

// Simulation utilities

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
  const font = `bold ${size}px ${fontFamily || "Arial"}`;
  const { baseline } = getLetterVisualBounds(letter, size, font);
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
    const font = `bold ${letterSize}px ${fontFamily || "Arial"}`;
    const { baseline } = getLetterVisualBounds(letter, letterSize, font);
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

/**
 * Poisson disk sampling for generating well-distributed random points
 * Returns array of [x, y] points
 */
export function poissonDiskSampling(
  width: number,
  height: number,
  minDistance: number,
  maxAttempts: number = 30,
  maxPoints: number = 100,
  restrictedArea: { x: number; y: number; size: number; margin: number; letter?: string; color?: string } | undefined = undefined,
  entityRadius: number = 0
): Array<[number, number]> {
  // Create active point list
  const points: Array<[number, number]> = [];
  const activePoints: Array<[number, number]> = [];
  const grid: Array<Array<number>> = [];
  const cellSize = minDistance / Math.sqrt(2);
  const gridWidth = Math.ceil(width / cellSize);
  const gridHeight = Math.ceil(height / cellSize);

  // Initialize grid
  for (let i = 0; i < gridWidth * gridHeight; i++) {
    grid[i] = [];
  }

  // Helper functions
  function gridCoords(p: Vector2): { x: number; y: number } {
    return {
      x: Math.floor(p.x / cellSize),
      y: Math.floor(p.y / cellSize)
    };
  }

  const isValidPoint = (x: number, y: number): boolean => {
    // Basic bounds check
    if (x < 0 || x >= width || y < 0 || y >= height) return false;

    // If there's a restricted area with a letter
    if (restrictedArea?.letter) {
      const letterCtx = createLetterPath(document.createElement('canvas').getContext('2d')!, restrictedArea.letter, restrictedArea.size).ctx;
      const letterCenterX = restrictedArea.x + restrictedArea.size / 2;
      const letterCenterY = restrictedArea.y + restrictedArea.size / 2;
      
      // Check if point is outside both letter bounds and margin
      const isInLetter = isPointInLetter(
        letterCtx,
        restrictedArea.letter,
        letterCenterX,
        letterCenterY,
        restrictedArea.size,
        x,
        y,
        restrictedArea.color || 'black'  // Use provided color or default to black
      );

      // We want points OUTSIDE the letter for initial placement
      return !isInLetter;
    }
    return true;
  };

  // Place initial point at top left corner to start filling
  const initialX = minDistance;
  const initialY = minDistance;

  if (isValidPoint(initialX, initialY)) {
    points.push([initialX, initialY]);
    activePoints.push([initialX, initialY]);
    const gridPos = gridCoords(new Vector2(initialX, initialY));
    grid[gridPos.y * gridWidth + gridPos.x].push(points.length - 1);
  }

  // Generate points
  while (activePoints.length > 0 && points.length < maxPoints) {
    const randomIndex = Math.floor(Math.random() * activePoints.length);
    const currentPoint = new Vector2(activePoints[randomIndex][0], activePoints[randomIndex][1]);
    let found = false;

    // Try to find a valid new point
    attempts: for (let i = 0; i < maxAttempts; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = minDistance * (1 + Math.random());
      const candidate = new Vector2(
        currentPoint.x + Math.cos(angle) * radius,
        currentPoint.y + Math.sin(angle) * radius
      );

      // Skip if candidate is out of bounds or in invalid area
      if (!isValidPoint(candidate.x, candidate.y)) continue;

      // Check if candidate is too close to existing points
      const gridPos = gridCoords(candidate);
      const cellsToCheck = [-1, 0, 1];
      
      for (const dx of cellsToCheck) {
        for (const dy of cellsToCheck) {
          const checkX = gridPos.x + dx;
          const checkY = gridPos.y + dy;
          
          if (checkX >= 0 && checkX < gridWidth && checkY >= 0 && checkY < gridHeight) {
            for (const pointIndex of grid[checkY * gridWidth + checkX]) {
              const point = points[pointIndex];
              const distSq = Math.pow(candidate.x - point[0], 2) + Math.pow(candidate.y - point[1], 2);
              if (distSq < minDistance * minDistance) {
                continue attempts;
              }
            }
          }
        }
      }

      // If we get here, the candidate is valid
      points.push([candidate.x, candidate.y]);
      activePoints.push([candidate.x, candidate.y]);
      grid[gridPos.y * gridWidth + gridPos.x].push(points.length - 1);
      found = true;
      break;
    }

    // If no valid point was found after maxAttempts, remove the current point from active list
    if (!found) {
      activePoints.splice(randomIndex, 1);
    }
  }

  return points;
}

/**
 * Convert a hex color to rgba format
 */
export function hexToRgba(hex: string, alpha: number = 1): string {
  // Convert hex color to rgba
  let r = 0, g = 0, b = 0;
  
  // Handle different hex formats
  if (hex.length === 4) {
    // #RGB format
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    // #RRGGBB format
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function createLetterPath(ctx: CanvasRenderingContext2D, letter: string, size: number, fontFamily?: string) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const tempCtx = canvas.getContext('2d')!;
  
  const font = `bold ${size}px ${fontFamily || "Arial"}`;
  const { baseline } = getLetterVisualBounds(letter, size, font);
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
    const minAllowedDistSq = Math.pow(blob.maxRadius + minBlobSize + repelDistance, 2);
    return distSq < minAllowedDistSq;
  });
}

// Utility: Get visual bounds of a letter in a canvas
export function getLetterVisualBounds(letter: string, size: number, font: string = 'bold Arial'): {top: number, bottom: number, height: number, baseline: number} {
  const canvas = document.createElement('canvas');
  canvas.width = size * 2;
  canvas.height = size * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.font = font.includes('px') ? font : `${font} ${size}px`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'black';
  ctx.fillText(letter, canvas.width/2, canvas.height/2);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let top = canvas.height, bottom = 0;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      if (imageData.data[i+3] > 0) { // non-transparent pixel
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  const height = bottom - top + 1;
  // Baseline offset: distance from canvas center to visual center
  const baseline = (canvas.height/2) - (top + height/2);
  return {top, bottom, height, baseline};
}

