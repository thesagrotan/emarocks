import { Vector2 } from "three";
import { Particle } from "./particle";
import { Spring } from "./spring";
import { isPointInLetter, createLetterPath, analyzeLetter, Region } from "./utils"; // Add new imports

// Temporary vector for calculations
const tempVec = new Vector2();

// Cache for letter regions to avoid recalculating
const letterRegionsCache = new Map<string, {
  regions: Region[];
  timestamp: number;
}>();

const CACHE_LIFETIME = 1000; // Cache lifetime in milliseconds

// Blob Class - represents a complete blob with particles and springs
export class Blob {
  centre: Vector2;
  maxRadius: number; // Dynamic radius based on particle positions
  edgePointCount: number;
  particles: Particle[];
  springs: Spring[];

  initialArea: number;
  targetArea: number;
  repelDistance: number;
  pressureConstant: number = 0.15; // Increased pressure constant
  maxRepulsionForce: number = 0.8; // Increased repulsion force
  id: number = Math.random();

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

  updateCentre() {
    if (this.particles.length === 0) return;
    this.centre.set(0, 0);
    this.particles.forEach(p => this.centre.add(p.pos));
    this.centre.divideScalar(this.particles.length);
  }

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

  // Repel other blobs
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

  collideWithStaticShape(
    ctx: CanvasRenderingContext2D,
    shapeType: 'letter' | null,
    shapeParams: { x: number; y: number; size: number; letter?: string; fontFamily?: string } | null // <-- Add fontFamily
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

// Improved: Finer search for nearest boundary and better normal estimation
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
            const nX =
              +isPointInLetter(ctx, letter, centerX, centerY, size, testX + eps, testY, "black", fontFamily)
              - isPointInLetter(ctx, letter, centerX, centerY, size, testX - eps, testY, "black", fontFamily);
            const nY =
              +isPointInLetter(ctx, letter, centerX, centerY, size, testX, testY + eps, "black", fontFamily)
              - isPointInLetter(ctx, letter, centerX, centerY, size, testX, testY - eps, "black", fontFamily);
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

  draw(ctx: CanvasRenderingContext2D, fillColor: string, strokeColor: string) {    
    if (this.particles.length < 2) return;
    ctx.beginPath();
        if (!this.particles[0]?.pos) {
      console.warn("First particle missing in draw");
      return;
    }
    ctx.moveTo(this.particles[0].pos.x, this.particles[0].pos.y);

    for (let i = 1; i <= this.edgePointCount; i++) {
      const currentIndex = i % this.edgePointCount;
      if (this.particles[currentIndex]?.pos) {
        ctx.lineTo(this.particles[currentIndex].pos.x, this.particles[currentIndex].pos.y);
      } else {
        console.warn(`Particle or position undefined at index ${currentIndex} during draw`);
        ctx.closePath();
        break;
      }
    }
    ctx.closePath();
    
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
  }

  // Get SVG path data for this blob
  getSVGPath(): string {
    if (this.particles.length < 2) return "";

    let path = `M ${this.particles[0].pos.x.toFixed(2)} ${this.particles[0].pos.y.toFixed(2)}`;

    for (let i = 1; i <= this.edgePointCount; i++) {
      const particle = this.particles[i % this.edgePointCount];
      if (particle?.pos) {
        path += ` L ${particle.pos.x.toFixed(2)} ${particle.pos.y.toFixed(2)}`;
      } else {
        console.warn(`Particle or position undefined at index ${i % this.edgePointCount} during SVG path generation`);
        return path + " Z";
      }
    }

    path += " Z";
    return path;
  }

  // Call this after all particles have been updated
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
    staticShapeParams: { x: number; y: number; size: number; letter?: string; fontFamily?: string } | null, // <-- Add fontFamily
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