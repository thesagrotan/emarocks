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
  ctx.font = `bold ${size}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(letter, x, y);
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
  restrictedArea: { x: number; y: number; size: number; margin: number } | undefined = undefined,
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

  // Helper function to check if point is in restricted area
  const isInRestrictedArea = (x: number, y: number): boolean => {
    if (!restrictedArea) return false;
    const margin = restrictedArea.margin || 0;
    const xmin = restrictedArea.x - margin - entityRadius;
    const xmax = restrictedArea.x + restrictedArea.size + margin + entityRadius;
    const ymin = restrictedArea.y - margin - entityRadius;
    const ymax = restrictedArea.y + restrictedArea.size + margin + entityRadius;
    return x >= xmin && x <= xmax && y >= ymin && y <= ymax;
  };

  // Add initial point
  let initialAttempts = 0;
  const maxInitialAttempts = 100;

  while (initialAttempts < maxInitialAttempts) {
    const x = Math.random() * width;
    const y = Math.random() * height;

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

  // Main sampling loop
  while (active.length > 0 && points.length < maxPoints) {
    const randomIndex = Math.floor(Math.random() * active.length);
    const currentPoint = active[randomIndex];
    let found = false;

    for (let i = 0; i < maxAttempts; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = minDistance + Math.random() * minDistance;
      const newX = currentPoint[0] + Math.cos(angle) * distance;
      const newY = currentPoint[1] + Math.sin(angle) * distance;

      // Check if point is in bounds and not in restricted area
      if (
        newX >= entityRadius && 
        newX < width - entityRadius && 
        newY >= entityRadius && 
        newY < height - entityRadius && 
        !isInRestrictedArea(newX, newY) && 
        !hasNeighbors(newX, newY)
      ) {
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