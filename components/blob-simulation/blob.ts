import { Vector2 } from "three";
import { Particle } from "./particle";
import { Spring } from "./spring";
import { isPointInLetter, createLetterPath, analyzeLetter, Region } from "./utils"; // Add new imports
import { logWarn, logInfo } from "@/shared"; // Import logger

/**
 * Temporary vector used for calculations within Blob methods to avoid repeated allocations.
 * @type {Vector2}
 */
const tempVec = new Vector2();

/**
 * Cache for storing analyzed letter region data to optimize collision detection.
 * @type {Map<string, { regions: Region[]; timestamp: number; }>}
 */
const letterRegionsCache = new Map<string, {
  regions: Region[];
  timestamp: number;
}>();

/**
 * Lifetime for cached letter region data in milliseconds.
 * @type {number}
 */
const CACHE_LIFETIME = 1000; // Cache lifetime in milliseconds

/**
 * Represents a single deformable blob in the simulation.
 * Composed of interconnected particles and springs, maintaining volume and interacting with other blobs and boundaries.
 */
export class Blob {
  /** The geometric center of the blob, calculated from particle positions. @type {Vector2} */
  centre: Vector2;
  /** The maximum distance from the center to any particle, defining the blob's current radius. @type {number} */
  maxRadius: number;
  /** The number of particles defining the blob's edge. @type {number} */
  edgePointCount: number;
  /** Array of Particle objects forming the blob's structure. @type {Particle[]} */
  particles: Particle[];
  /** Array of Spring objects connecting adjacent particles. @type {Spring[]} */
  springs: Spring[];

  /** The initial calculated area of the blob at creation. @type {number} */
  initialArea: number;
  /** The target area the blob tries to maintain via pressure forces. Can change dynamically. @type {number} */
  targetArea: number;
  /** The distance at which this blob starts repelling other blobs. @type {number} */
  repelDistance: number;
  /** Constant factor influencing the strength of pressure forces maintaining the blob's area. @type {number} */
  pressureConstant: number = 0.15;
  /** Maximum magnitude of the repulsion force applied between particles of different blobs. @type {number} */
  maxRepulsionForce: number = 0.8;
  /** Unique identifier for the blob. @type {number} */
  id: number = Math.random();

  /**
   * Creates an instance of Blob.
   * @param {number} x - Initial x-coordinate of the blob's center.
   * @param {number} y - Initial y-coordinate of the blob's center.
   * @param {number} edgePointCount - Number of particles for the blob's edge.
   * @param {number} startSize - Initial radius of the blob.
   * @param {number} repelDistance - Distance at which this blob repels others.
   */
  constructor(x: number, y: number, edgePointCount: number, startSize: number, repelDistance: number) {
    this.centre = new Vector2(x, y);
    this.edgePointCount = edgePointCount;
    this.particles = [];
    this.springs = [];
    this.maxRadius = Math.max(1, startSize); // Ensure startSize is at least 1
    this.initialArea = Math.PI * this.maxRadius * this.maxRadius;
    this.targetArea = this.initialArea;
    this.repelDistance = repelDistance;
    this.setup();
  }

  /**
   * Initializes the particles and springs for the blob based on its properties.
   * Creates particles in a circular arrangement around the center and connects them with springs.
   * @protected
   */
  setup() {
    this.particles.length = 0;
    this.springs.length = 0;

    const safeRadius = this.maxRadius; // Already ensured > 0 in constructor
    const angleStep = (Math.PI * 2) / this.edgePointCount;
    // Ensure initialSpringLength is positive and reasonable
    const initialSpringLength = Math.max(1e-6, safeRadius * Math.sin(Math.PI / this.edgePointCount) * 2);

    for (let i = 0; i < this.edgePointCount; i++) {
      const angle = i * angleStep;
      const x = Math.cos(angle) * safeRadius + this.centre.x;
      const y = Math.sin(angle) * safeRadius + this.centre.y;
      this.particles.push(new Particle(x, y));

      if (i > 0) {
        this.springs.push(new Spring(this.particles[i], this.particles[i - 1], initialSpringLength));
      }
    }
    this.springs.push(new Spring(this.particles[0], this.particles[this.edgePointCount - 1], initialSpringLength));
  }

  /**
   * Recalculates the blob's geometric center based on the current positions of its particles.
   * @protected
   */
  updateCentre() {
    if (this.particles.length === 0) return;
    this.centre.set(0, 0);
    this.particles.forEach(p => this.centre.add(p.pos));
    this.centre.divideScalar(this.particles.length);
  }

  /**
   * Recalculates the blob's maximum radius based on the farthest particle from the center.
   * @protected
   */
  updateMaxRadius() {
    if (this.particles.length === 0) {
      this.maxRadius = 0;
      return;
    }
    let maxDistSq = 0;
    this.particles.forEach((particle) => {
      const distSq = this.centre.distanceToSquared(particle.pos);
      if (distSq > maxDistSq) maxDistSq = distSq;
    });
    this.maxRadius = Math.sqrt(maxDistSq);
  }

  /**
   * Applies repulsion forces between this blob's particles and the particles of other nearby blobs.
   * Only applies forces when particles are within the `effectiveRepelDistance`.
   * @param {Blob[]} blobs - An array of other blobs in the simulation to interact with.
   * @param {number} interactionStrength - A factor controlling the magnitude of repulsion forces.
   */
  repelBlobs(blobs: Blob[], interactionStrength: number) {
    blobs.forEach((blobB) => {
      if (this.id === blobB.id) return;

      // Use a smaller effective repel distance
      const effectiveRepelDistance = Math.min(this.repelDistance, blobB.repelDistance);
      
      const distBetweenCentersSq = this.centre.distanceToSquared(blobB.centre);
      const combinedRadii = this.maxRadius + blobB.maxRadius;
      const interactionRangeSq = Math.pow(combinedRadii + effectiveRepelDistance, 2);

      if (distBetweenCentersSq > interactionRangeSq) return;

      this.particles.forEach((particleA) => {
        blobB.particles.forEach((particleB) => {
          tempVec.copy(particleA.pos).sub(particleB.pos);
          const distSq = tempVec.lengthSq();

          // Only repel when very close
          if (distSq > 1e-12 && distSq < effectiveRepelDistance * effectiveRepelDistance) {
            const dist = Math.sqrt(distSq);
            const overlap = effectiveRepelDistance - dist;

            // Stronger repulsion at very close distances
            let forceMagnitude = overlap * interactionStrength * (1 + Math.max(0, (4 - dist) / 4));

            forceMagnitude = Math.min(forceMagnitude, this.maxRepulsionForce);
            tempVec.multiplyScalar(forceMagnitude / dist);

            particleA.applyForce(tempVec);
            particleB.applyForce(tempVec.multiplyScalar(-1));
          }
        });
      });
    });
  }

  /**
   * Calculates the current area of the blob using the shoelace formula based on particle positions.
   * @returns {number} The current area of the blob.
   */
  get area(): number {
    let total = 0;
    if (this.particles.length < 3) return 0;

    for (let i = 0; i < this.edgePointCount; i++) {
      const p1 = this.particles[i].pos;
      const p2 = this.particles[(i + 1) % this.edgePointCount].pos;
      total += p1.x * p2.y - p2.x * p1.y;
    }
    return Math.abs(total / 2);
  }

  /**
   * Gradually increases the blob's `targetArea` up to a maximum limit defined by `maxExpansionFactor`.
   * Simulates blob growth or expansion pressure.
   * @param {number} maxExpansionFactor - The maximum factor by which the blob's area can expand relative to its initial area.
   */
  grow(maxExpansionFactor: number) {
    if (this.initialArea <= 0) return;
    const maxTargetArea = this.initialArea * Math.max(1, maxExpansionFactor);

    if (this.targetArea < maxTargetArea) {
      this.targetArea *= 1.005; // Slow growth
      this.targetArea = Math.min(this.targetArea, maxTargetArea); // Clamp to max
    } else if (this.targetArea > maxTargetArea) {
      this.targetArea = maxTargetArea;
    }
  }

  /**
   * Applies pressure forces to the blob's particles to maintain its `targetArea`.
   * Pushes particles outwards if the current area is too small, inwards if too large.
   * @protected
   */
  maintainPressure() {
    const currentArea = this.area;
    if (currentArea < 1e-6 || this.targetArea < 1e-6) return;

    // Calculate pressure to maintain shape and push against boundaries
    const areaRatio = this.targetArea / currentArea;
    const clampedRatio = Math.max(0.5, Math.min(areaRatio, 2.5)); // Allow more expansion
    const pressureDifference = clampedRatio - 1;

    const forceSize = pressureDifference * this.pressureConstant;
    const maxPressureForce = 0.2; // Increased max pressure force
    const cappedForceSize = Math.max(-maxPressureForce, Math.min(forceSize, maxPressureForce));

    this.particles.forEach((particle, i) => {
      const prev = this.particles[(i + this.edgePointCount - 1) % this.edgePointCount];
      const next = this.particles[(i + 1) % this.edgePointCount];

      // Calculate edge vectors and normal
      const toPrev = tempVec.copy(prev.pos).sub(particle.pos);
      const toNext = new Vector2().copy(next.pos).sub(particle.pos);
      const edgeVector = toNext.sub(toPrev);
      const outwardNormal = new Vector2(-edgeVector.y, edgeVector.x);

      if (outwardNormal.lengthSq() < 1e-12) return;
      outwardNormal.normalize();

      // Apply pressure force
      outwardNormal.multiplyScalar(cappedForceSize);
      particle.applyForce(outwardNormal);
    });
  }

  /**
   * Handles collisions between the blob's particles and a static shape (currently only 'letter').
   * If a particle is detected inside the shape, it attempts to move it to the nearest boundary point
   * and reflects its velocity.
   * @param {CanvasRenderingContext2D} ctx - Canvas context for checking points within the letter.
   * @param {'letter' | null} shapeType - The type of static shape to collide with.
   * @param {{ x: number; y: number; size: number; letter?: string; fontFamily?: string } | null} shapeParams - Parameters defining the static shape (position, size, letter character, font family).
   */
  collideWithStaticShape(
    ctx: CanvasRenderingContext2D,
    shapeType: 'letter' | null,
    shapeParams: { x: number; y: number; size: number; letter?: string; fontFamily?: string } | null
  ) {
    if (!shapeType || !shapeParams || !shapeParams.letter) return;

    const letterCenterX = shapeParams.x + shapeParams.size / 2;
    const letterCenterY = shapeParams.y + shapeParams.size / 2;

    // Process all particles
    this.particles.forEach((particle) => {
      const isInLetter = isPointInLetter(
        ctx,
        shapeParams.letter!,
        letterCenterX,
        letterCenterY,
        shapeParams.size,
        particle.pos.x,
        particle.pos.y,
        "black",
        shapeParams.fontFamily // <-- Pass fontFamily
      );

      if (isInLetter) {
        // Find nearest point outside the letter
        const boundaryPoint = this.findNearestLetterPoint(
          ctx,
          shapeParams.letter!,
          letterCenterX,
          letterCenterY,
          shapeParams.size,
          particle.pos.x,
          particle.pos.y,
          shapeParams.fontFamily // <-- Pass fontFamily
        );

        if (boundaryPoint) {
          // Move the particle directly to the boundary point
          particle.pos.copy(boundaryPoint);
          
          // Reflect velocity to bounce off the boundary
          const normal = new Vector2(
            particle.pos.x - letterCenterX,
            particle.pos.y - letterCenterY
          ).normalize();

          const velocityDot = particle.vel.dot(normal);
          if (velocityDot < 0) {
            // Moving into the letter, reflect velocity
            particle.vel.addScaledVector(normal, -2 * velocityDot);
            // Add damping to the reflection
            particle.vel.multiplyScalar(0.5);
          }
        }
      }
    });
  }

  /**
   * Finds the nearest point on the boundary of a letter shape from a given point (x, y).
   * Uses a radial search algorithm to locate the closest edge. Also estimates the surface normal at that point.
   * @private
   * @param {CanvasRenderingContext2D} ctx - Canvas context for checking points within the letter.
   * @param {string} letter - The letter character defining the shape.
   * @param {number} centerX - X-coordinate of the letter's center.
   * @param {number} centerY - Y-coordinate of the letter's center.
   * @param {number} size - Size parameter of the letter shape.
   * @param {number} x - The x-coordinate of the point to find the nearest boundary from.
   * @param {number} y - The y-coordinate of the point to find the nearest boundary from.
   * @param {string} [fontFamily] - Font family used for the letter shape.
   * @returns {Vector2 | null} The nearest point on the letter boundary as a Vector2, or null if not found. The returned vector may have a `.normal` property attached.
   */
  private findNearestLetterPoint(
    ctx: CanvasRenderingContext2D,
    letter: string,
    centerX: number,
    centerY: number,
    size: number,
    x: number,
    y: number,
    fontFamily?: string
  ): Vector2 | null {
    const isInside = isPointInLetter(ctx, letter, centerX, centerY, size, x, y, "black", fontFamily);
    let minDist = Infinity;
    let nearestPoint = null;
    let bestNormal = null;
    const directions = 24;
    const step = 0.5; // Finer step for precision
    const maxRadius = size;
    for (let i = 0; i < directions; i++) {
      const angle = (i * Math.PI * 2) / directions;
      let radius = step;
      let lastInLetter = isInside;
      while (radius <= maxRadius) {
        const testX = x + Math.cos(angle) * radius;
        const testY = y + Math.sin(angle) * radius;
        const testInLetter = isPointInLetter(ctx, letter, centerX, centerY, size, testX, testY, "black", fontFamily);
        if (testInLetter !== lastInLetter) {
          const dist = Math.hypot(testX - x, testY - y);
          if (dist < minDist) {
            minDist = dist;
            nearestPoint = new Vector2(testX, testY);
            // Estimate normal by central difference
            const eps = 1;
            // Convert boolean results to numbers (1 or 0) using + operator
            const nX =
              +(isPointInLetter(ctx, letter, centerX, centerY, size, testX + eps, testY, "black", fontFamily))
              - +(isPointInLetter(ctx, letter, centerX, centerY, size, testX - eps, testY, "black", fontFamily));
            const nY =
              +(isPointInLetter(ctx, letter, centerX, centerY, size, testX, testY + eps, "black", fontFamily))
              - +(isPointInLetter(ctx, letter, centerX, centerY, size, testX, testY - eps, "black", fontFamily));
            const normal = new Vector2(nX, nY);
            if (normal.lengthSq() > 0) normal.normalize();
            bestNormal = normal;
          }
          break;
        }
        lastInLetter = testInLetter;
        radius += step;
      }
    }
    // Attach normal to the result for use in velocity reflection
    if (nearestPoint && bestNormal) {
      (nearestPoint as any).normal = bestNormal;
    }
    return nearestPoint;
  }

  /**
   * Draws the blob onto the provided canvas context.
   * Renders the blob as a filled and stroked polygon defined by its particle positions.
   * Optionally scales the drawing based on the provided scaleFactor.
   * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
   * @param {string} fillColor - The fill color (e.g., 'rgba(r,g,b,a)') for the blob.
   * @param {string} strokeColor - The stroke color for the blob's outline.
   * @param {number} [scaleFactor=1] - Optional scaling factor to apply to the drawing coordinates.
   */
  draw(ctx: CanvasRenderingContext2D, fillColor: string, strokeColor: string, scaleFactor: number = 1) {    
    if (this.particles.length < 2) return;
    ctx.beginPath();
        if (!this.particles[0]?.pos) {
      logWarn("First particle missing in draw", { blobId: this.id }, "Blob.draw"); // Replaced console.warn
      return;
    }
    // Apply scale factor to the first point
    ctx.moveTo(this.particles[0].pos.x * scaleFactor, this.particles[0].pos.y * scaleFactor);

    for (let i = 1; i <= this.edgePointCount; i++) {
      const currentIndex = i % this.edgePointCount;
      if (this.particles[currentIndex]?.pos) {
        // Apply scale factor to subsequent points
        ctx.lineTo(this.particles[currentIndex].pos.x * scaleFactor, this.particles[currentIndex].pos.y * scaleFactor);
      } else {
        logWarn(`Particle or position undefined at index ${currentIndex} during draw`, { blobId: this.id }, "Blob.draw"); // Replaced console.warn
        ctx.closePath();
        break;
      }
    }
    ctx.closePath();
    
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    // Scale line width slightly for smaller previews, but ensure it's at least 0.5
    ctx.lineWidth = Math.max(0.5, 1 * scaleFactor);
    ctx.fill();
    // Log the values just before stroking
    logInfo(`Drawing blob ${this.id} border`, { strokeColor, lineWidth: ctx.lineWidth }, "Blob.draw");
    ctx.stroke();
  }

  /**
   * Generates an SVG path string representing the blob's current shape.
   * Creates a closed path ('Z') connecting all particle positions.
   * @returns {string} The SVG path data string (e.g., "M x1 y1 L x2 y2 ... Z").
   */
  getSVGPath(): string {
    if (this.particles.length < 2) return "";

    let path = `M ${this.particles[0].pos.x.toFixed(2)} ${this.particles[0].pos.y.toFixed(2)}`;

    for (let i = 1; i <= this.edgePointCount; i++) {
      const particle = this.particles[i % this.edgePointCount];
      if (particle?.pos) {
        path += ` L ${particle.pos.x.toFixed(2)} ${particle.pos.y.toFixed(2)}`;
      } else {
        logWarn(`Particle or position undefined at index ${i % this.edgePointCount} during SVG path generation`, { blobId: this.id }, "Blob.getSVGPath"); // Replaced console.warn
        return path + " Z";
      }
    }

    path += " Z";
    return path;
  }

  /**
   * Enforces the boundary constraint for a static letter shape *after* particle positions have been updated.
   * This acts as a hard constraint, ensuring no particle remains inside the letter shape.
   * If a particle is inside, it's moved to the nearest boundary point, and its velocity is reflected.
   * @param {CanvasRenderingContext2D} ctx - Canvas context for checking points.
   * @param {'letter' | null} shapeType - The type of static shape.
   * @param {{ x: number; y: number; size: number; letter?: string; fontFamily?: string } | null} shapeParams - Parameters defining the static shape.
   */
  enforceLetterBoundaryAfterUpdate(
    ctx: CanvasRenderingContext2D,
    shapeType: 'letter' | null,
    shapeParams: { x: number; y: number; size: number; letter?: string; fontFamily?: string } | null
  ) {
    if (!shapeType || !shapeParams || !shapeParams.letter) return;
    const letterCenterX = shapeParams.x + shapeParams.size / 2;
    const letterCenterY = shapeParams.y + shapeParams.size / 2;
    this.particles.forEach((particle) => {
      const isInLetter = isPointInLetter(
        ctx,
        shapeParams.letter!,
        letterCenterX,
        letterCenterY,
        shapeParams.size,
        particle.pos.x,
        particle.pos.y,
        "black",
        shapeParams.fontFamily
      );
      if (isInLetter) {
        const boundaryPoint = this.findNearestLetterPoint(
          ctx,
          shapeParams.letter!,
          letterCenterX,
          letterCenterY,
          shapeParams.size,
          particle.pos.x,
          particle.pos.y,
          shapeParams.fontFamily
        );
        if (boundaryPoint) {
          const prevPos = particle.pos.clone();
          particle.pos.copy(boundaryPoint);
          // Use improved normal if available
          let normal = (boundaryPoint as any).normal;
          if (!normal || normal.lengthSq() === 0) {
            normal = new Vector2(
              boundaryPoint.x - prevPos.x,
              boundaryPoint.y - prevPos.y
            ).normalize();
          }
          // Reflect velocity if moving into the boundary
          const velocityDot = particle.vel.dot(normal);
          if (velocityDot < 0) {
            particle.vel.addScaledVector(normal, -2 * velocityDot);
            particle.vel.multiplyScalar(0.3); // Stronger damping for stability
          }
        }
      }
    });
  }

  /**
   * Performs a full update cycle for the blob for one time step.
   * Applies internal forces (pressure, springs), external forces (gravity, repulsion, collision),
   * updates particle positions and velocities, enforces boundaries, and updates blob state (center, radius, target area).
   *
   * @param {Blob[]} blobs - Array of all blobs in the simulation for interaction checks.
   * @param {number} springTension - Stiffness factor for the springs connecting particles.
   * @param {number} canvasWidth - Width of the simulation canvas.
   * @param {number} canvasHeight - Height of the simulation canvas.
   * @param {number} margin - Margin inset from the canvas edges for boundary collision.
   * @param {boolean} isRoundedContainer - Flag indicating if the container boundary is circular.
   * @param {number} interactionStrength - Factor controlling the strength of inter-blob repulsion.
   * @param {number} maxExpansionFactor - Maximum factor for blob area growth.
   * @param {number} gravity - Vertical force applied to particles (0 for no gravity).
   * @param {number} damping - Factor reducing particle velocity over time (simulates friction).
   * @param {'letter' | null} staticShapeType - Type of static shape for collision detection.
   * @param {{ x: number; y: number; size: number; letter?: string; fontFamily?: string } | null} staticShapeParams - Parameters defining the static shape.
   * @param {CanvasRenderingContext2D | null} ctx - Canvas context, required if static shape collision is enabled.
   */
  update(
    blobs: Blob[],
    springTension: number,
    canvasWidth: number,
    canvasHeight: number,
    margin: number,
    isRoundedContainer: boolean,
    interactionStrength: number,
    maxExpansionFactor: number,
    gravity: number,
    damping: number,
    staticShapeType: 'letter' | null,
    staticShapeParams: { x: number; y: number; size: number; letter?: string; fontFamily?: string }, // <-- Add fontFamily
    ctx: CanvasRenderingContext2D | null
  ) {
    // --- Force Application Phase ---
    // Apply internal forces first (pressure, springs)
    this.maintainPressure();
    this.springs.forEach((spring) => spring.update(springTension));

    // Apply density-based pressure adjustment
    if (ctx && staticShapeType === 'letter' && staticShapeParams?.letter) {
      const letterCenterX = staticShapeParams.x + staticShapeParams.size / 2;
      const letterCenterY = staticShapeParams.y + staticShapeParams.size / 2;
      const isInLetter = isPointInLetter(
        ctx,
        staticShapeParams.letter,
        letterCenterX,
        letterCenterY,
        staticShapeParams.size,
        this.centre.x,
        this.centre.y
      );

      // Calculate local density and adjust pressure accordingly
      const targetArea = this.initialArea * maxExpansionFactor;
      const currentArea = this.area;
      const areaRatio = currentArea / targetArea;

      // If we're in a region with higher density, increase expansion force
      if (areaRatio < 1) {
        this.targetArea = this.initialArea * (maxExpansionFactor * 1.2);
      } else {
        this.targetArea = this.initialArea * maxExpansionFactor;
      }
    }

    // Apply external forces (gravity, inter-blob repulsion, static collision)
    this.particles.forEach((particle) => {
      particle.applyForce(new Vector2(0, gravity * 0.1));
    });

    this.repelBlobs(blobs, interactionStrength);
    
    if (ctx && staticShapeType && staticShapeParams) {
      this.collideWithStaticShape(ctx, staticShapeType, staticShapeParams);
    }

    // --- Update Phase ---
    // Update particles using applied forces and damping
    this.particles.forEach((particle) => {
      particle.update(canvasWidth, canvasHeight, margin, isRoundedContainer, damping);
    });

    // Enforce letter boundary after all updates (hard constraint)
    if (ctx && staticShapeType === 'letter' && staticShapeParams?.letter) {
      this.enforceLetterBoundaryAfterUpdate(ctx, staticShapeType, staticShapeParams);
    }

    // Update blob state based on new particle positions
    this.updateCentre();
    this.updateMaxRadius();

    // Apply growth after updates
    this.grow(maxExpansionFactor);
  }
}