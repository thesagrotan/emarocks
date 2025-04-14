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
  color: string = "white"
) {
  // Save the current context state
  ctx.save();
  
  // Draw with strong emphasis to ensure visibility
  ctx.font = `bold ${size}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  
  // Fill the letter
  ctx.fillStyle = color;
  ctx.fillText(letter, x, y);
  
  // Optional: Add an outline for better visibility
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.strokeText(letter, x, y);
  
  // Restore the context
  ctx.restore();
}

// Cache for letter shapes to avoid recreating canvases
const letterShapeCache: Map<string, {
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
  pointY: number
): boolean {
  // Create a unique cache key based on the letter and its size
  const cacheKey = `${letter}-${letterSize}`;
  
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
    
    // Clear canvas with white background
    offCtx.fillStyle = 'white';
    offCtx.fillRect(0, 0, w, h);
    
    // Draw the letter in black
    offCtx.fillStyle = 'black';
    offCtx.font = `bold ${letterSize}px Arial`;
    offCtx.textAlign = "center";
    offCtx.textBaseline = "middle";
    offCtx.fillText(letter, w/2, h/2);
    
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
  
  // If pixel is dark, it's part of the letter
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
  restrictedArea: { x: number; y: number; size: number; margin: number; letter?: string } | undefined = undefined,
  entityRadius: number = 0
): Array<[number, number]> {
  // Implementation of Poisson disk sampling algorithm
  // Returns array of [x, y] coordinates for blob initialization

  // Check for extreme values that would cause infinite loops
  if (minDistance <= 0 || width <= 0 || height <= 0) {
    console.warn("Invalid parameters for Poisson disk sampling");
    return [];
  }

  const points: Array<[number, number]> = [];
  const cellSize = minDistance / Math.sqrt(2);
  const gridWidth = Math.ceil(width / cellSize);
  const gridHeight = Math.ceil(height / cellSize);
  const grid = new Array(gridWidth * gridHeight).fill(null);
  const active: Array<[number, number]> = [];

  // Create a temporary canvas for letter shape testing only once
  let letterCanvas: HTMLCanvasElement | null = null;
  let letterCtx: CanvasRenderingContext2D | null = null;
  let letterCenterX: number = 0;
  let letterCenterY: number = 0;
  
  // Pre-compute a bounding box for quick exclusion tests
  let restrictedBounds = {
    minX: 0, minY: 0, maxX: width, maxY: height,
    hasLetter: false
  };
  
  if (restrictedArea?.letter) {
    letterCanvas = document.createElement('canvas');
    letterCanvas.width = width;
    letterCanvas.height = height;
    letterCtx = letterCanvas.getContext('2d');
    
    if (letterCtx) {
      letterCenterX = restrictedArea.x + restrictedArea.size / 2;
      letterCenterY = restrictedArea.y + restrictedArea.size / 2;
      
      // Draw the letter once to create the path for testing
      drawLetter(
        letterCtx, 
        restrictedArea.letter, 
        letterCenterX, 
        letterCenterY, 
        restrictedArea.size
      );
      
      // Pre-compute the bounding box with margin for quicker exclusion tests
      const margin = restrictedArea.margin || 0;
      restrictedBounds = {
        minX: restrictedArea.x - margin - entityRadius,
        minY: restrictedArea.y - margin - entityRadius,
        maxX: restrictedArea.x + restrictedArea.size + margin + entityRadius,
        maxY: restrictedArea.y + restrictedArea.size + margin + entityRadius,
        hasLetter: true
      };
    }
  }

  // Helper function to check if point is in restricted area - optimized version
  const isInRestrictedArea = (x: number, y: number): boolean => {
    if (!restrictedArea) return false;
    
    // First do a quick rectangle bounds check (optimization)
    if (x < restrictedBounds.minX || x > restrictedBounds.maxX || 
        y < restrictedBounds.minY || y > restrictedBounds.maxY) {
      return false; // Outside bounding rectangle
    }
    
    // For letter shape, check if the point is inside the letter path
    if (restrictedBounds.hasLetter && letterCtx && restrictedArea.letter) {
      // When many points are being tested during initialization, we use a faster
      // but less accurate check for points far from the letter
      
      // Distance from point to center of letter
      const dx = x - letterCenterX;
      const dy = y - letterCenterY;
      const distSq = dx*dx + dy*dy;
      
      // If very close to letter center, definitely check
      // If very far, we can skip the expensive isPointInLetter check
      const letterRadius = restrictedArea.size / 2;
      const outerRadiusSq = (letterRadius + restrictedArea.margin) * (letterRadius + restrictedArea.margin);
      const innerRadiusSq = (letterRadius * 0.3) * (letterRadius * 0.3);
      
      // If point is far outside the letter's maximum possible radius, skip
      if (distSq > outerRadiusSq) {
        return false;
      }
      
      // If point is very close to center, it's likely inside
      if (distSq < innerRadiusSq) {
        return true;
      }
      
      // For points in the border region, do the full check
      return isPointInLetter(
        letterCtx,
        restrictedArea.letter,
        letterCenterX,
        letterCenterY,
        restrictedArea.size,
        x,
        y
      );
    }
    
    // Default rectangle check
    return true; // Already passed the bounding box check above
  };

  // Add initial point
  let initialAttempts = 0;
  const maxInitialAttempts = 100;

  // Try to place initial point efficiently
  while (initialAttempts < maxInitialAttempts) {
    // First try corners and edges which are usually free
    let x: number, y: number;
    
    if (initialAttempts < 4) {
      // Try corners first
      const corner = initialAttempts % 4;
      x = corner < 2 ? entityRadius : width - entityRadius;
      y = corner % 2 === 0 ? entityRadius : height - entityRadius;
    } else if (initialAttempts < 12) {
      // Try edge centers
      const edge = (initialAttempts - 4) % 4;
      if (edge === 0) {
        x = width / 2;
        y = entityRadius;
      } else if (edge === 1) {
        x = width - entityRadius;
        y = height / 2;
      } else if (edge === 2) {
        x = width / 2;
        y = height - entityRadius;
      } else {
        x = entityRadius;
        y = height / 2;
      }
    } else {
      // Random position
      x = Math.random() * width;
      y = Math.random() * height;
    }

    if (!isInRestrictedArea(x, y)) {
      addPoint(x, y);
      break;
    }
    initialAttempts++;
  }

  // If couldn't place initial point outside restricted area after many attempts
  if (initialAttempts >= maxInitialAttempts && points.length === 0) {
    // Just add a point at the corner as fallback
    addPoint(entityRadius, entityRadius);
  }

  // Main sampling loop - optimized for performance
  while (active.length > 0 && points.length < maxPoints) {
    const randomIndex = Math.floor(Math.random() * active.length);
    const currentPoint = active[randomIndex];
    let found = false;

    for (let i = 0; i < maxAttempts; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = minDistance + Math.random() * minDistance;
      const newX = currentPoint[0] + Math.cos(angle) * distance;
      const newY = currentPoint[1] + Math.sin(angle) * distance;

      // Check if point is in bounds first (fastest check)
      if (newX < entityRadius || newX >= width - entityRadius || 
          newY < entityRadius || newY >= height - entityRadius) {
        continue; // Skip out-of-bounds points immediately
      }
      
      // Check restricted area next (medium cost)
      if (isInRestrictedArea(newX, newY)) {
        continue; // Skip restricted points
      }
      
      // Check neighbors last (most expensive in dense areas)
      if (!hasNeighbors(newX, newY)) {
        addPoint(newX, newY);
        found = true;
        break;
      }
    }

    if (!found) {
      // If no valid point found after max attempts, remove current point from active list
      active.splice(randomIndex, 1);
    }
  }

  // Cleanup temporary resources
  if (letterCanvas) {
    // Help garbage collection
    letterCanvas.width = 1;
    letterCanvas.height = 1;
  }

  return points;

  // Helper functions
  function addPoint(x: number, y: number) {
    const point: [number, number] = [x, y];
    points.push(point);
    active.push(point);

    const gridX = Math.floor(x / cellSize);
    const gridY = Math.floor(y / cellSize);
    grid[gridY * gridWidth + gridX] = points.length - 1;
  }

  function hasNeighbors(x: number, y: number): boolean {
    const gridX = Math.floor(x / cellSize);
    const gridY = Math.floor(y / cellSize);

    const startX = Math.max(0, gridX - 2);
    const endX = Math.min(gridWidth - 1, gridX + 2);
    const startY = Math.max(0, gridY - 2);
    const endY = Math.min(gridHeight - 1, gridY + 2);

    for (let y1 = startY; y1 <= endY; y1++) {
      for (let x1 = startX; x1 <= endX; x1++) {
        const pointIndex = grid[y1 * gridWidth + x1];
        if (pointIndex !== null) {
          const point = points[pointIndex];
          const dx = point[0] - x;
          const dy = point[1] - y;
          const distSq = dx * dx + dy * dy;
          if (distSq < minDistance * minDistance) {
            return true;
          }
        }
      }
    }
    return false;
  }
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