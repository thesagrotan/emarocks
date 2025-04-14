import { Vector2 } from "three";
import { Particle } from "./particle";
import { Spring } from "./spring";

// Temporary vector for calculations
const tempVec = new Vector2();

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
  pressureConstant: number = 0.08; // Pressure constant
  maxRepulsionForce: number = 0.5; // Cap for repulsion force magnitude
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

      // Use the same repelDistance for both blobs to ensure consistency
      const effectiveRepelDistance = Math.max(this.repelDistance, blobB.repelDistance);
      
      const distBetweenCentersSq = this.centre.distanceToSquared(blobB.centre);
      // Use radii squared for comparison to avoid sqrt
      const combinedRadii = this.maxRadius + blobB.maxRadius;
      const interactionRangeSq = Math.pow(combinedRadii + effectiveRepelDistance, 2);

      // Optimization: Broad phase check based on centers and radii + repel distance
      if (distBetweenCentersSq > interactionRangeSq) return;

      // Narrow phase: Check particle pairs
      this.particles.forEach((particleA) => {
        blobB.particles.forEach((particleB) => {
          tempVec.copy(particleA.pos).sub(particleB.pos);
          const distSq = tempVec.lengthSq(); // Use squared distance

          // Apply repulsion force if within repelDistance squared
          const repelDistSq = effectiveRepelDistance * effectiveRepelDistance;
          if (distSq > 1e-12 && distSq < repelDistSq) { // Compare squared distances
            const dist = Math.sqrt(distSq);
            const overlap = effectiveRepelDistance - dist;

            // Calculate force magnitude based on overlap and strength
            let forceMagnitude = overlap * interactionStrength;

            // Cap the force magnitude
            forceMagnitude = Math.min(forceMagnitude, this.maxRepulsionForce);

            // Normalize direction vector (reuse tempVec) and apply magnitude
            tempVec.multiplyScalar(forceMagnitude / dist);

            // Apply forces ensuring they are finite
            particleA.applyForce(tempVec);
            particleB.applyForce(tempVec.multiplyScalar(-1)); // Apply opposite force
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

    // Make pressure force proportional to the difference ratio, but prevent extreme forces
    const areaRatio = this.targetArea / currentArea;
    // Clamp the ratio to prevent excessive forces when area is very small
    const clampedRatio = Math.max(0.5, Math.min(areaRatio, 2.0));
    const pressureDifference = clampedRatio - 1;

    const forceSize = pressureDifference * this.pressureConstant;

    // Limit the maximum force size to prevent instability
    const maxPressureForce = 0.1; // Example cap
    const cappedForceSize = Math.max(-maxPressureForce, Math.min(forceSize, maxPressureForce));

    this.particles.forEach((particle, i) => {
      const prev = this.particles[(i + this.edgePointCount - 1) % this.edgePointCount];
      const next = this.particles[(i + 1) % this.edgePointCount];

      // Calculate edge vectors from the particle to its neighbors
      const toPrev = tempVec.copy(prev.pos).sub(particle.pos);
      const toNext = new Vector2().copy(next.pos).sub(particle.pos); // Use a separate Vector2 instance

      // Calculate outward normal using the cross product concept (for 2D)
      const edgeVector = toNext.sub(toPrev); // Vector along the edge (next - prev)
      const outwardNormal = new Vector2(-edgeVector.y, edgeVector.x); // Perpendicular vector

      if (outwardNormal.lengthSq() < 1e-12) return; // Skip if normal is zero length

      outwardNormal.normalize();
      outwardNormal.multiplyScalar(cappedForceSize);
      particle.applyForce(outwardNormal);
    });
  }

  // Collision with Static Obstacles
  collideWithStaticShape(
    ctx: CanvasRenderingContext2D,
    shapeType: 'rectangle' | 'letter' | null,
    shapeParams: { x: number; y: number; size: number; letter?: string } | null
  ) {
    if (!shapeType || !shapeParams) return;

    let shapeBounds: { minX: number, minY: number, maxX: number, maxY: number } | null = null;

    if (shapeType === 'rectangle') {
      shapeBounds = {
        minX: shapeParams.x,
        minY: shapeParams.y,
        maxX: shapeParams.x + shapeParams.size,
        maxY: shapeParams.y + shapeParams.size
      };
    } else if (shapeType === 'letter' && shapeParams.letter && ctx) {
      const letterWidth = shapeParams.size * 0.8;
      const letterHeight = shapeParams.size;
      const letterCenterX = shapeParams.x + shapeParams.size / 2;
      const letterCenterY = shapeParams.y + shapeParams.size / 2;

      shapeBounds = {
        minX: letterCenterX - letterWidth / 2,
        minY: letterCenterY - letterHeight / 2,
        maxX: letterCenterX + letterWidth / 2,
        maxY: letterCenterY + letterHeight / 2,
      };
    }

    if (!shapeBounds) return;

    this.particles.forEach((particle) => {
      if (
        particle.pos.x > shapeBounds.minX &&
        particle.pos.x < shapeBounds.maxX &&
        particle.pos.y > shapeBounds.minY &&
        particle.pos.y < shapeBounds.maxY
      ) {
        const dxMin = particle.pos.x - shapeBounds.minX;
        const dxMax = shapeBounds.maxX - particle.pos.x;
        const dyMin = particle.pos.y - shapeBounds.minY;
        const dyMax = shapeBounds.maxY - particle.pos.y;

        const minDist = Math.min(dxMin, dxMax, dyMin, dyMax);
        const pushForce = new Vector2();
        let overlap = 0;

        if (minDist === dxMin) { pushForce.set(-1, 0); overlap = dxMin; }
        else if (minDist === dxMax) { pushForce.set(1, 0); overlap = dxMax; }
        else if (minDist === dyMin) { pushForce.set(0, -1); overlap = dyMin; }
        else { pushForce.set(0, 1); overlap = dyMax; }

        // Apply a smaller, continuous force
        pushForce.multiplyScalar(0.2); // Smaller push strength
        particle.applyForce(pushForce);

        // Apply damping on collision
        particle.vel.multiplyScalar(0.5); // Stronger damping on static collision
      }
    });
  }

  draw(ctx: CanvasRenderingContext2D, fillColor: string, strokeColor: string) {
    if (this.particles.length < 2) return;

    ctx.beginPath();
    // Ensure first particle exists before moving to it
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
    ctx.closePath(); // Close path after loop

    // Check context state before filling/stroking
    if (ctx.fillStyle !== fillColor) ctx.fillStyle = fillColor;
    if (ctx.strokeStyle !== strokeColor) ctx.strokeStyle = strokeColor;
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
    staticShapeType: 'rectangle' | 'letter' | null,
    staticShapeParams: { x: number; y: number; size: number; letter?: string } | null,
    ctx: CanvasRenderingContext2D | null
  ) {
    // --- Force Application Phase ---
    // Apply internal forces first (pressure, springs)
    this.maintainPressure();
    this.springs.forEach((spring) => spring.update(springTension));

    // Apply external forces (gravity, inter-blob repulsion, static collision)
    this.particles.forEach((particle) => {
      particle.applyForce(new Vector2(0, gravity * 0.1)); // Apply gravity per particle
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

    // Update blob state based on new particle positions
    this.updateCentre();
    this.updateMaxRadius();

    // Apply growth after updates
    this.grow(maxExpansionFactor);
  }
}