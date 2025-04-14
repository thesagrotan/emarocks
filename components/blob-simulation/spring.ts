import { Vector2 } from "three";
import { Particle } from "./particle";

// Temporary vector for calculations
const tempVec = new Vector2();

// Spring Class - connects particles with spring forces
export class Spring {
  particleA: Particle;
  particleB: Particle;
  restLength: number;
  tensionConstant: number = 0.002; // Default tension constant

  constructor(particleA: Particle, particleB: Particle, restLength: number) {
    this.particleA = particleA;
    this.particleB = particleB;
     // Ensure restLength is positive
    this.restLength = Math.max(1e-6, restLength);
  }

  update(tensionOverride?: number) {
    const tension = tensionOverride !== undefined ?
        // Ensure tension override calculation is reasonable
        Math.max(0, tensionOverride) / 10 :
        this.tensionConstant;

    const force = tempVec.copy(this.particleB.pos).sub(this.particleA.pos); // Direction from A to B
    const currentLength = force.length();

    if (currentLength < 1e-6) return; // Avoid division by zero if particles are coincident

    const stretch = currentLength - this.restLength;
    force.multiplyScalar(1 / currentLength); // Normalize the force vector

    // Calculate spring force: k * displacement
    force.multiplyScalar(tension * stretch);

    // Apply forces ensuring they are finite
    this.particleA.applyForce(force); // Force pulls A towards B
    this.particleB.applyForce(force.multiplyScalar(-1)); // Equal opposite force pulls B towards A
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.moveTo(this.particleA.pos.x, this.particleA.pos.y);
    ctx.lineTo(this.particleB.pos.x, this.particleB.pos.y);
    ctx.stroke();
  }
}