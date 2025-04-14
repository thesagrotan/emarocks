import { Vector2 } from "three";

// Poisson Disk Sampling Function
// Add minBlobSize as a parameter to the function
export function poissonDiskSampling(
  width: number,
  height: number,
  minDist: number,
  k = 30,
  maxPoints?: number,
  restrictedArea?: { x: number; y: number; size: number; margin: number },
  minBlobSize?: number // Added optional minBlobSize, though not used in the copied logic directly here
): Array<[number, number]> {
  const radiusSq = minDist * minDist;
  const cellSize = minDist / Math.SQRT2;

  const gridWidth = Math.ceil(width / cellSize);
  const gridHeight = Math.ceil(height / cellSize);
  const grid = new Array(gridWidth * gridHeight).fill(null);
  const points: Vector2[] = [];
  const active: Vector2[] = [];

  function gridCoords(p: Vector2) {
    return {
      x: Math.floor(p.x / cellSize),
      y: Math.floor(p.y / cellSize),
    };
  }

  function insertPoint(p: Vector2) {
    const coords = gridCoords(p);
    grid[coords.x + coords.y * gridWidth] = p;
    points.push(p);
    active.push(p);
  }

  function isFarEnough(p: Vector2): boolean {
    const coords = gridCoords(p);
    const minX = Math.max(0, coords.x - 2);
    const minY = Math.max(0, coords.y - 2);
    const maxX = Math.min(gridWidth - 1, coords.x + 2);
    const maxY = Math.min(gridHeight - 1, coords.y + 2);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const neighbor = grid[x + y * gridWidth];
        if (neighbor) {
          if (p.distanceToSquared(neighbor) < radiusSq) return false;
        }
      }
    }
    return true;
  }

  function isOutsideRestrictedArea(p: Vector2): boolean {
    if (!restrictedArea) return true;

    const minX = restrictedArea.x - restrictedArea.margin;
    const maxX = restrictedArea.x + restrictedArea.size + restrictedArea.margin;
    const minY = restrictedArea.y - restrictedArea.margin;
    const maxY = restrictedArea.y + restrictedArea.size + restrictedArea.margin;

    return p.x < minX || p.x > maxX || p.y < minY || p.y > maxY;
  }

  if (width <= 0 || height <= 0) return [];

  // Ensure the initial point is outside the restricted area
  let p0;
  let attempts = 0; // Add attempt counter to prevent infinite loop
  do {
    p0 = new Vector2(Math.random() * width, Math.random() * height);
    attempts++;
    if (attempts > 1000) { // Safety break
        console.error("Could not find a valid starting point for Poisson Disk Sampling outside the restricted area.");
        return [];
    }
  } while (!isOutsideRestrictedArea(p0));
  insertPoint(p0);

  while (active.length > 0 && (!maxPoints || points.length < maxPoints)) {
    const activeIndex = Math.floor(Math.random() * active.length);
    const currentPoint = active[activeIndex];
    let foundCandidate = false;

    for (let i = 0; i < k; i++) {
      if (maxPoints && points.length >= maxPoints) break;

      const angle = Math.random() * Math.PI * 2;
      const radius = minDist * (1 + Math.random());
      const candidate = new Vector2(
        currentPoint.x + Math.cos(angle) * radius,
        currentPoint.y + Math.sin(angle) * radius
      );

      // Check if candidate is within canvas bounds first
      if (
        candidate.x < 0 ||
        candidate.x >= width ||
        candidate.y < 0 ||
        candidate.y >= height
      ) {
        continue; // Skip points outside canvas
      }

      // Check if candidate is inside the restricted area (if defined)
      if (restrictedArea) {
          const minX = restrictedArea.x - restrictedArea.margin;
          const maxX = restrictedArea.x + restrictedArea.size + restrictedArea.margin;
          const minY = restrictedArea.y - restrictedArea.margin;
          const maxY = restrictedArea.y + restrictedArea.size + restrictedArea.margin;

          if (
            candidate.x >= minX &&
            candidate.x <= maxX &&
            candidate.y >= minY &&
            candidate.y <= maxY
          ) {
            continue; // Skip points inside the restricted area
          }
      }

      // Check distance from other points and ensure it's outside restricted area again (redundant check but safe)
      if (isFarEnough(candidate) && isOutsideRestrictedArea(candidate)) {
          insertPoint(candidate);
          foundCandidate = true;
      }
    }

    if (!foundCandidate) {
      active.splice(activeIndex, 1);
    }
  }

  return points.map((p): [number, number] => [p.x, p.y]);
}


export function hexToRgba(hex: string, alpha = 1): string {
  // Remove the # if present
  hex = hex.replace("#", "");

  // Parse the hex values
  let r, g, b;
  if (hex.length === 3) {
    r = Number.parseInt(hex[0] + hex[0], 16);
    g = Number.parseInt(hex[1] + hex[1], 16);
    b = Number.parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) { // Ensure it handles 6-digit hex correctly
    r = Number.parseInt(hex.substring(0, 2), 16);
    g = Number.parseInt(hex.substring(2, 4), 16);
    b = Number.parseInt(hex.substring(4, 6), 16);
  } else {
      console.warn(`Invalid hex color provided to hexToRgba: ${hex}`);
      // Return a default color (e.g., transparent black) or throw an error
      return `rgba(0, 0, 0, 0)`;
  }

  // Check if parsing resulted in valid numbers
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
     console.warn(`Could not parse hex color: ${hex}`);
      return `rgba(0, 0, 0, 0)`;
  }


  // Return rgba string
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}