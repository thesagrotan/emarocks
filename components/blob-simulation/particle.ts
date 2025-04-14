import { Vector2 } from "three";

// Temporary vector for calculations to avoid excess object creation
const tempVec = new Vector2();

// Particle Class - represents a point in the blob boundary
export class Particle {
  pos: Vector2;
  vel: Vector2;
  acc: Vector2;
  stuckFrames?: number; // Track frames stuck in letter shape

  constructor(x: number, y: number) {
    this.pos = new Vector2(x, y);
    this.vel = new Vector2();
    this.acc = new Vector2();
    this.stuckFrames = 0; // Initialize stuck counter
  }

  applyForce(force: Vector2) {
    // Ensure force is finite before applying
    if (isFinite(force.x) && isFinite(force.y)) {
       this.acc.add(force);
    } else {
        console.warn("Attempted to apply non-finite force to particle:", force);
    }
  }

  update(canvasWidth: number, canvasHeight: number, margin: number, isRoundedContainer: boolean, damping: number = 0.95, bounceFactor: number = -0.5) {
    // Apply damping
    this.vel.multiplyScalar(damping);

    // Update velocity and position
    this.vel.add(this.acc);
    this.pos.add(this.vel);

    // Boundary collision detection
    const canvasCenter = new Vector2(canvasWidth / 2, canvasHeight / 2);
    // Ensure circleRadius calculation doesn't yield negative values
    const effectiveDim = Math.max(0, Math.min(canvasWidth, canvasHeight) - margin * 2);
    const circleRadius = effectiveDim / 2;

    if (isRoundedContainer && circleRadius > 0) {
      const distFromCenterSq = this.pos.distanceToSquared(canvasCenter);
      if (distFromCenterSq > circleRadius * circleRadius) {
        const distFromCenter = Math.sqrt(distFromCenterSq);
        const direction = tempVec.copy(this.pos).sub(canvasCenter).multiplyScalar(1 / distFromCenter); // Normalized direction
        // Move particle exactly to the boundary
        this.pos.copy(canvasCenter).addScaledVector(direction, circleRadius);
        // Reflect velocity component normal to the boundary
         const normalComponent = this.vel.dot(direction);
         if (normalComponent > 0) { // Only reflect if moving outwards
            this.vel.addScaledVector(direction, -normalComponent * (1 + Math.abs(bounceFactor))); // Apply bounce factor
         }
      }
    } else {
       // Rectangular boundary checks (ensure margin doesn't exceed canvas size)
       const boundaryLeft = margin;
       const boundaryRight = Math.max(boundaryLeft, canvasWidth - margin);
       const boundaryTop = margin;
       const boundaryBottom = Math.max(boundaryTop, canvasHeight - margin);

        // Use else-if to prevent double collision checks if corners are involved
        if (this.pos.x < boundaryLeft) {
            this.pos.x = boundaryLeft;
            if (this.vel.x < 0) this.vel.x *= bounceFactor; // Only bounce if moving into boundary
        } else if (this.pos.x > boundaryRight) {
            this.pos.x = boundaryRight;
            if (this.vel.x > 0) this.vel.x *= bounceFactor;
        }

        if (this.pos.y < boundaryTop) {
            this.pos.y = boundaryTop;
            if (this.vel.y < 0) this.vel.y *= bounceFactor;
        } else if (this.pos.y > boundaryBottom) {
            this.pos.y = boundaryBottom;
            if (this.vel.y > 0) this.vel.y *= bounceFactor;
        }
    }

    this.acc.set(0, 0); // Reset acceleration using set for clarity
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, 2, 0, Math.PI * 2); // Particle radius hardcoded to 2
    ctx.fill();
  }
}