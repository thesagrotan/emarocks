// blob-simulation.tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { Download, Pause, Play, Plus, Eraser } from "lucide-react"
import { Button } from "@/components/ui/button" // Assuming these paths are correct
import { Slider } from "@/components/ui/slider"
import { Card } from "@/components/ui/card"
import { useTheme } from "next-themes"
import { Vector2 } from "three"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { poissonDiskSampling, hexToRgba } from "./utils" // Import from the consolidated utils file

// --- Core Simulation Classes ---

const origin = new Vector2();
const tempVec = new Vector2();

// Particle Class
class Particle {
  pos: Vector2;
  vel: Vector2;
  acc: Vector2;

  constructor(x: number, y: number) {
    this.pos = new Vector2(x, y);
    this.vel = new Vector2();
    this.acc = new Vector2();
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

    // Limit acceleration to prevent extreme velocity changes in one step
    // const maxAcc = 1.0; // Example cap, adjust as needed
    // if (this.acc.lengthSq() > maxAcc * maxAcc) {
    //     this.acc.normalize().multiplyScalar(maxAcc);
    // }


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
        // Optional tangential friction (reduce velocity parallel to boundary)
         // const tangent = new Vector2(-direction.y, direction.x);
         // const tangentComponent = this.vel.dot(tangent);
         // this.vel.addScaledVector(tangent, -tangentComponent * 0.1); // Small friction factor
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

// Spring Class
class Spring {
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

// Blob Class
class Blob {
  centre: Vector2;
  maxRadius: number; // Dynamic radius based on particle positions
  edgePointCount: number;
  particles: Particle[];
  springs: Spring[];

  initialArea: number;
  targetArea: number;
  repelDistance: number;
  pressureConstant: number = 0.08; // SLIGHTLY REDUCED pressure constant
  maxRepulsionForce: number = 0.5; // ADDED: Cap for repulsion force magnitude
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
      // Centre should be updated before calculating radius from it
      // this.updateCentre();
      let maxDistSq = 0;
      this.particles.forEach((particle) => {
        const distSq = this.centre.distanceToSquared(particle.pos);
        if (distSq > maxDistSq) maxDistSq = distSq;
      });
      this.maxRadius = Math.sqrt(maxDistSq);
  }

  // Repel other blobs
  repelBlobs(blobs: Blob[], interactionStrength: number) {
     // No need to update radius here, do it in the main update loop after particle moves

    blobs.forEach((blobB) => {
      if (this.id === blobB.id) return;

      const distBetweenCentersSq = this.centre.distanceToSquared(blobB.centre);
       // Use radii squared for comparison to avoid sqrt
      const combinedRadii = this.maxRadius + blobB.maxRadius;
      const interactionRangeSq = Math.pow(combinedRadii + this.repelDistance, 2); // Range check includes repel distance

      // Optimization: Broad phase check based on centers and radii + repel distance
      if (distBetweenCentersSq > interactionRangeSq) return;


      // Narrow phase: Check particle pairs
      this.particles.forEach((particleA) => {
        blobB.particles.forEach((particleB) => {
          tempVec.copy(particleA.pos).sub(particleB.pos);
          const distSq = tempVec.lengthSq(); // Use squared distance

          // Apply repulsion force if within repelDistance squared
           const repelDistSq = this.repelDistance * this.repelDistance;
          if (distSq > 1e-12 && distSq < repelDistSq) { // Compare squared distances
              const dist = Math.sqrt(distSq);
              const overlap = this.repelDistance - dist;

              // Calculate force magnitude based on overlap and strength
              let forceMagnitude = overlap * interactionStrength;

              // *** ADDED: Cap the force magnitude ***
              forceMagnitude = Math.min(forceMagnitude, this.maxRepulsionForce);


              // Normalize direction vector (reuse tempVec) and apply magnitude
              tempVec.multiplyScalar(forceMagnitude / dist); // Apply force (already normalized direction * magnitude)


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
    const maxTargetArea = this.initialArea * Math.max(1, maxExpansionFactor); // Ensure factor is at least 1

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
    const clampedRatio = Math.max(0.5, Math.min(areaRatio, 2.0)); // Example clamp, adjust as needed
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
         // Normal = normalize(perpendicular(next - prev))
         const edgeVector = toNext.sub(toPrev); // Vector along the edge (next - prev)
         const outwardNormal = new Vector2(-edgeVector.y, edgeVector.x); // Perpendicular vector

        if (outwardNormal.lengthSq() < 1e-12) return; // Skip if normal is zero length

        outwardNormal.normalize();


        // Apply force along the normal, scaled by cappedForceSize
        outwardNormal.multiplyScalar(cappedForceSize);


        particle.applyForce(outwardNormal);
    });
}



  // Collision with Static Obstacles
  collideWithStaticShape( /* ... parameters remain the same ... */
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

                 // Push particle out directly by the overlap distance? Might be too harsh.
                 // particle.pos.addScaledVector(pushForce, -overlap); // Move out directly?

                 // Apply a smaller, continuous force instead
                 pushForce.multiplyScalar(0.2); // Smaller push strength
                 particle.applyForce(pushForce);

                 // Apply damping on collision
                 particle.vel.multiplyScalar(0.5); // Stronger damping on static collision
            }
        });
    }


  draw(/* ... parameters remain the same ... */
     ctx: CanvasRenderingContext2D, fillColor: string, strokeColor: string
  ) {
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
  getSVGPath(/* ... parameters remain the same ... */): string {
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

 update( /* ... parameters mostly the same ... */
    blobs: Blob[],
    springTension: number,
    canvasWidth: number,
    canvasHeight: number,
    margin: number,
    isRoundedContainer: boolean,
    interactionStrength: number,
    maxExpansionFactor: number,
    gravity: number,
    damping: number, // Passed damping value
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
        particle.update(canvasWidth, canvasHeight, margin, isRoundedContainer, damping); // Pass damping HERE
    });

    // Update blob state based on new particle positions
    this.updateCentre();
    this.updateMaxRadius();

    // Apply growth after updates
    this.grow(maxExpansionFactor);
}


}

// --- Utility Functions Specific to this Component ---
function drawLetter(ctx: CanvasRenderingContext2D, letter: string, x: number, y: number, size: number, color: string = "white") {
  ctx.font = `bold ${size}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(letter, x, y);
}

// --- React Component ---

export function BlobSimulation() {
  // --- State ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const animationFrameIdRef = useRef<number | null>(null);
  const blobsRef = useRef<Blob[]>([]);
  const { theme } = useTheme();

  // Simulation Parameters - *** Adjusted Defaults ***
  const [shapeCount, setShapeCount] = useState(15);
  const [edgePointCount, setEdgePointCount] = useState(25);
  const [minBlobSize, setMinBlobSize] = useState(10);
  const [repelDistance, setRepelDistance] = useState(15);
  const [springTension, setSpringTension] = useState(0.2);
  const [interactionStrength, setInteractionStrength] = useState(0.015); // *** REDUCED default ***
  const [gravity, setGravity] = useState(0);
  const [damping, setDamping] = useState(0.98); // *** INCREASED default ***
  const [maxExpansionFactor, setMaxExpansionFactor] = useState(2.5);
  const [speed, setSpeed] = useState(1); // Not currently used in animation loop speed

  // Container/Appearance
  const [containerMargin, setContainerMargin] = useState(20);
  const [isRoundedContainer, setIsRoundedContainer] = useState(false);
  const [showBorder, setShowBorder] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState("#aac9ca");
  const [darkBackgroundColor, setDarkBackgroundColor] = useState("#1a2b2f");
  const [blobFillColor, setBlobFillColor] = useState("#ffffff");
  const [blobFillOpacity, setBlobFillOpacity] = useState(0.3);
  const [darkBlobFillColor, setDarkBlobFillColor] = useState("#000000");
  const [darkBlobFillOpacity, setDarkBlobFillOpacity] = useState(0.3);
  const [blobBorderColor, setBlobBorderColor] = useState("#466e91");
  const [darkBlobBorderColor, setDarkBlobBorderColor] = useState("#77e4cb");

  // Interaction/Tools
  const [toolMode, setToolMode] = useState<'add' | 'remove' | null>(null);

  // Restricted Area / Static Obstacle
  const [restrictedAreaEnabled, setRestrictedAreaEnabled] = useState(true);
  const [restrictedAreaShape, setRestrictedAreaShape] = useState<'rectangle' | 'letter'>('letter');
  const [restrictedAreaSize, setRestrictedAreaSize] = useState(100);
  const [restrictedAreaLetter, setRestrictedAreaLetter] = useState('A');
  const [restrictedAreaMargin, setRestrictedAreaMargin] = useState(30);

  // Calculate restricted area params based on state
  const calculateRestrictedAreaParams = (canvasWidth: number, canvasHeight: number) => {
      if (!restrictedAreaEnabled) return undefined;
       const centerX = canvasWidth / 2;
       const centerY = canvasHeight / 2;
      return {
          x: centerX - restrictedAreaSize / 2,
          y: centerY - restrictedAreaSize / 2,
          size: restrictedAreaSize,
          margin: restrictedAreaMargin,
          letter: restrictedAreaLetter
      };
  };

 // --- Effects ---
  useEffect(() => {
    initializeSimulation();
    setIsInitialized(true);
    return () => {
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
      blobsRef.current = [];
      setIsAnimating(false);
    };
  }, []);

  useEffect(() => {
      if (!isInitialized) return;
      handleRestart();
  }, [shapeCount, edgePointCount, minBlobSize]);


  useEffect(() => {
      if (!isInitialized) return;
      draw();
  }, [
    theme, isRoundedContainer, showBorder, containerMargin,
    backgroundColor, darkBackgroundColor, blobFillColor, blobFillOpacity,
    darkBlobFillColor, darkBlobFillOpacity, blobBorderColor, darkBlobBorderColor,
    restrictedAreaEnabled, restrictedAreaShape, restrictedAreaSize, restrictedAreaLetter
  ]);


  // --- Core Functions ---

  const initializeSimulation = () => {
    console.log("Initializing simulation...");
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    setIsAnimating(false);

    const canvasSize = 512;
    const dpi = window.devicePixelRatio || 1;
    canvas.width = canvasSize * dpi;
    canvas.height = canvasSize * dpi;
    canvas.style.width = `${canvasSize}px`;
    canvas.style.height = `${canvasSize}px`;
    ctx.setTransform(dpi, 0, 0, dpi, 0, 0); // Set transform immediately

    const logicalWidth = canvasSize - containerMargin * 2;
    const logicalHeight = canvasSize - containerMargin * 2;
    const minBlobDist = (minBlobSize * 2) + repelDistance;
    const pdsRestrictedArea = calculateRestrictedAreaParams(logicalWidth, logicalHeight);

    let points: Array<[number, number]> = [];
    try {
        points = poissonDiskSampling(
            logicalWidth, logicalHeight, minBlobDist, 30, shapeCount,
            pdsRestrictedArea, minBlobSize
        );
    } catch (error) { console.error("PDS Error:", error); }

    if (points.length < shapeCount) {
        console.warn(`PDS Warning: Generated ${points.length}/${shapeCount} points.`);
    }

    blobsRef.current = points.map(([x, y]) => new Blob(
        x + containerMargin, y + containerMargin,
        edgePointCount, minBlobSize, repelDistance
    ));

    console.log("Initialization complete.");
    draw();
  };


 const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      const currentTheme = theme || "light";
      const colors = { /* ... colors remain the same ... */
        bg: currentTheme === "dark" ? darkBackgroundColor : backgroundColor,
        fg: currentTheme === "dark" ? "#f6fefa" : "#04050c",
        accent: currentTheme === "dark" ? darkBlobBorderColor : blobBorderColor,
        fill: currentTheme === "dark" ?
          hexToRgba(darkBlobFillColor, darkBlobFillOpacity) :
          hexToRgba(blobFillColor, blobFillOpacity),
        border: currentTheme === "dark" ? darkBlobBorderColor : blobBorderColor,
        obstacle: currentTheme === "dark" ? "#f87171" : "#dc2626",
        obstacleText: currentTheme === "dark" ? "#111827" : "#ffffff",
      };

      const dpi = window.devicePixelRatio || 1;
      const canvasWidth = 512;
      const canvasHeight = 512;

      // Reset transform and clear canvas - Ensure this happens every frame
      ctx.setTransform(dpi, 0, 0, dpi, 0, 0);
      ctx.clearRect(0, 0, canvasWidth, canvasHeight); // Use clearRect for performance
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);


      // Draw container boundary
      if (showBorder && containerMargin > 0) {
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 1;
        if (isRoundedContainer) {
          const radius = (Math.min(canvasWidth, canvasHeight) - containerMargin * 2) / 2;
          const centerX = canvasWidth / 2;
          const centerY = canvasHeight / 2;
           if (radius > 0) { // Only draw if radius is positive
              ctx.beginPath();
              ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
              ctx.stroke();
           }
        } else {
          ctx.strokeRect(containerMargin, containerMargin, canvasWidth - containerMargin * 2, canvasHeight - containerMargin * 2);
        }
      }

      // Draw blobs
      blobsRef.current.forEach((blob) => {
        if (blob?.draw) blob.draw(ctx, colors.fill, colors.border);
      });


      // Draw static obstacle/restricted area visualization
       const restrictedAreaParams = calculateRestrictedAreaParams(canvasWidth, canvasHeight);
      if (restrictedAreaEnabled && restrictedAreaParams) { /* ... drawing logic remains the same ... */
           ctx.lineWidth = 2;
          if (restrictedAreaShape === 'rectangle') {
               ctx.strokeStyle = colors.obstacle;
              ctx.strokeRect(restrictedAreaParams.x, restrictedAreaParams.y, restrictedAreaParams.size, restrictedAreaParams.size);
          } else if (restrictedAreaShape === 'letter' && restrictedAreaParams.letter) {
              drawLetter(
                  ctx, restrictedAreaParams.letter,
                  restrictedAreaParams.x + restrictedAreaParams.size / 2,
                  restrictedAreaParams.y + restrictedAreaParams.size / 2,
                  restrictedAreaParams.size, colors.obstacle
              );
          }
      }

    } catch (error) {
      console.error("Error during draw cycle:", error);
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      setIsAnimating(false);
    }
  };

  const animate = () => {
    if (!canvasRef.current) { setIsAnimating(false); return; }
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) { setIsAnimating(false); return; }

    try {
      const canvasWidth = 512;
      const canvasHeight = 512;
      const restrictedAreaParams = calculateRestrictedAreaParams(canvasWidth, canvasHeight);
      const shapeType = restrictedAreaEnabled ? restrictedAreaShape : null;
      const shapeParams = restrictedAreaEnabled ? restrictedAreaParams : null;

      // --- Update Step ---
      blobsRef.current.forEach((blob) => {
        if (blob?.update) {
           blob.update(
            blobsRef.current, springTension,
            canvasWidth, canvasHeight, containerMargin, isRoundedContainer,
            interactionStrength, maxExpansionFactor,
            gravity, damping, // Pass updated damping value
            shapeType, shapeParams, ctx
          );
        }
      });

      // --- Draw Step ---
      draw(); // Call draw AFTER all updates are done

      // Request next frame
      animationFrameIdRef.current = requestAnimationFrame(animate);

    } catch (error) {
      console.error("Error during animation update:", error);
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      setIsAnimating(false);
    }
  };

  // --- Event Handlers ---

  const toggleAnimation = () => {
    setIsAnimating(prev => {
        const nextIsAnimating = !prev;
        if (nextIsAnimating) {
            console.log("Animation starting");
            if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current); // Clear just in case
            animationFrameIdRef.current = requestAnimationFrame(animate);
        } else {
            console.log("Animation stopping");
            if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
        }
        return nextIsAnimating;
    });
};


  const handleRestart = () => {
    console.log("Restarting simulation...");
    // Stop animation reliably
    if (isAnimating) {
        if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
        setIsAnimating(false); // Set state directly after cancelling
    }
    // Clear blobs visually
    blobsRef.current = [];
    // Use requestAnimationFrame for the redraw to avoid race conditions
    requestAnimationFrame(() => {
        draw(); // Draw empty canvas
        // Re-initialize after the draw confirms canvas is clear
        setTimeout(() => {
            initializeSimulation();
        }, 50); // Small delay still useful
     });

  };


 const downloadSVG = () => { /* ... download logic remains the same ... */
    console.log("Generating SVG...");
    const canvasWidth = 512;
    const canvasHeight = 512;
    const currentTheme = theme || "light";

     const colors = {
      bg: currentTheme === "dark" ? darkBackgroundColor : backgroundColor,
      fill: currentTheme === "dark" ?
            hexToRgba(darkBlobFillColor, darkBlobFillOpacity) :
            hexToRgba(blobFillColor, blobFillOpacity),
      border: currentTheme === "dark" ? darkBlobBorderColor : blobBorderColor,
      obstacle: currentTheme === "dark" ? "#f87171" : "#dc2626",
    };

    let svgContent = `<svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg" style="background-color: ${colors.bg};">`;

    if (showBorder && containerMargin > 0) {
       const borderAttrs = `fill="none" stroke="${colors.border}" stroke-width="1"`;
      if (isRoundedContainer) {
          const radius = (Math.min(canvasWidth, canvasHeight) - containerMargin * 2) / 2;
          const centerX = canvasWidth / 2;
          const centerY = canvasHeight / 2;
          svgContent += `<circle cx="${centerX}" cy="${centerY}" r="${radius}" ${borderAttrs} />`;
      } else {
          svgContent += `<rect x="${containerMargin}" y="${containerMargin}" width="${canvasWidth - containerMargin * 2}" height="${canvasHeight - containerMargin * 2}" ${borderAttrs} />`;
      }
    }

    blobsRef.current.forEach((blob) => {
      if (blob && blob.particles.length > 0) {
        const path = blob.getSVGPath();
        svgContent += `<path d="${path}" fill="${colors.fill}" stroke="${colors.border}" stroke-width="1" />`;
      }
    });

      const restrictedAreaParams = calculateRestrictedAreaParams(canvasWidth, canvasHeight);
      if (restrictedAreaEnabled && restrictedAreaParams) {
           const obstacleAttrs = `fill="none" stroke="${colors.obstacle}" stroke-width="2"`;
           if (restrictedAreaShape === 'rectangle') {
               svgContent += `<rect x="${restrictedAreaParams.x}" y="${restrictedAreaParams.y}" width="${restrictedAreaParams.size}" height="${restrictedAreaParams.size}" ${obstacleAttrs} />`;
           } else if (restrictedAreaShape === 'letter' && restrictedAreaParams.letter) {
               svgContent += `<text x="${restrictedAreaParams.x + restrictedAreaParams.size / 2}" y="${restrictedAreaParams.y + restrictedAreaParams.size / 2}" font-family="Arial" font-size="${restrictedAreaParams.size * 0.8}" font-weight="bold" fill="${colors.obstacle}" text-anchor="middle" dominant-baseline="middle">${restrictedAreaParams.letter}</text>`;
          }
      }

    svgContent += `</svg>`;

    try {
      const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "blob-simulation.svg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
       console.log("SVG download initiated.");
    } catch (error) {
      console.error("Error downloading SVG:", error);
      alert("Failed to download SVG. See console for details.");
    }
  };

 const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => { /* ... click logic remains the same ... */
    const canvas = canvasRef.current;
    if (!canvas || !toolMode) return;

    const rect = canvas.getBoundingClientRect();
     const dpi = window.devicePixelRatio || 1;
    const scaleX = canvas.width / dpi / rect.width;
    const scaleY = canvas.height / dpi / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    console.log(`Canvas click detected (${toolMode}) at: ${x.toFixed(1)}, ${y.toFixed(1)}`);

    if (toolMode === 'add') {
      if (x < containerMargin || x > 512 - containerMargin || y < containerMargin || y > 512 - containerMargin) {
           console.warn("Cannot add shape: click is outside the container margin.");
           return;
      }

      const isOverlapping = blobsRef.current.some(blob => {
         if (!blob || !blob.centre || typeof blob.maxRadius === 'undefined') return false;
         const distSq = blob.centre.distanceToSquared(new Vector2(x, y));
         const minAllowedDistSq = Math.pow(blob.maxRadius + minBlobSize, 2);
         return distSq < minAllowedDistSq;
      });

      if (isOverlapping) {
        console.warn("Cannot add shape: potential overlap with existing shapes.");
        return;
      }

        const restrictedParams = calculateRestrictedAreaParams(512, 512);
        if (restrictedAreaEnabled && restrictedParams) {
            const raMinX = restrictedParams.x - restrictedParams.margin;
            const raMaxX = restrictedParams.x + restrictedParams.size + restrictedParams.margin;
            const raMinY = restrictedParams.y - restrictedParams.margin;
            const raMaxY = restrictedParams.y + restrictedParams.size + restrictedParams.margin;
             if (x >= raMinX && x <= raMaxX && y >= raMinY && y <= raMaxY) {
                 console.warn("Cannot add shape: inside restricted area.");
                 return;
             }
        }

      const newBlob = new Blob(x, y, edgePointCount, minBlobSize, repelDistance);
      blobsRef.current.push(newBlob);
      console.log(`Added new blob at ${x.toFixed(1)}, ${y.toFixed(1)}`);

    } else if (toolMode === 'remove') {
      let removedCount = 0;
      blobsRef.current = blobsRef.current.filter((blob) => {
         if (!blob || !blob.centre || typeof blob.maxRadius === 'undefined') return true;
        const distSq = blob.centre.distanceToSquared(new Vector2(x, y));
        if (distSq <= blob.maxRadius * blob.maxRadius) {
           removedCount++;
           return false;
        }
        return true;
      });
       console.log(`Removed ${removedCount} blob(s) near ${x.toFixed(1)}, ${y.toFixed(1)}`);
    }

    setToolMode(null);
    draw(); // Redraw immediately after add/remove
  };


  // --- JSX ---
  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start p-4 md:p-6">
      {/* Canvas Container */}
      <div className="relative w-full max-w-[512px] aspect-square flex-shrink-0 mx-auto lg:mx-0">
         {/* Canvas Element */}
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className={`block rounded-lg w-full h-full border border-neutral-300 dark:border-neutral-700 ${toolMode ? 'cursor-crosshair' : 'cursor-default'}`}
          style={{ backgroundColor: theme === 'dark' ? darkBackgroundColor : backgroundColor }}
        />
         {/* Canvas Overlays */}
         <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center pointer-events-none"> {/* Make overlay container non-interactive */}
             {/* Play/Pause Button */}
            <Button
                variant="outline"
                size="icon"
                onClick={toggleAnimation}
                className="bg-black/40 text-white hover:bg-black/60 border-none rounded-full pointer-events-auto" // Enable interaction
                aria-label={isAnimating ? 'Pause simulation' : 'Play simulation'}
            >
                {isAnimating ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>

             {/* Tool Buttons */}
             <div className="flex gap-2 pointer-events-auto"> {/* Enable interaction */}
                  <Button
                     variant="outline" size="icon"
                    onClick={() => setToolMode(current => current === 'add' ? null : 'add')}
                    className={`bg-black/40 text-white hover:bg-black/60 border-none rounded-full ${toolMode === 'add' ? 'ring-2 ring-white' : ''}`} // Simpler ring
                    aria-label="Add Shape Tool" >
                    <Plus className="w-5 h-5" />
                 </Button>
                  <Button
                     variant="outline" size="icon"
                    onClick={() => setToolMode(current => current === 'remove' ? null : 'remove')}
                     className={`bg-black/40 text-white hover:bg-black/60 border-none rounded-full ${toolMode === 'remove' ? 'ring-2 ring-white' : ''}`} // Simpler ring
                    aria-label="Remove Shape Tool" >
                    <Eraser className="w-5 h-5" />
                 </Button>
             </div>

            {/* Download Button */}
            <Button
                variant="outline" size="icon"
                onClick={downloadSVG}
                className="bg-black/40 text-white hover:bg-black/60 border-none rounded-full pointer-events-auto" // Enable interaction
                aria-label="Download as SVG" >
                <Download className="w-5 h-5" />
            </Button>
         </div>
      </div>

      {/* Settings Panel */}
       {/* Settings Panel */}
      <Card className="bg-white/80 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 p-4 rounded-lg w-full max-w-[320px] flex-shrink-0 shadow-md backdrop-blur-sm">
         <div className="space-y-4">
          <h3 className="font-semibold text-lg text-center mb-4">Blob Controls</h3>

           {/* Simulation Parameters */}
           <div className="grid grid-cols-1 gap-4">
                {/* Sliders with labels showing current value */}
                <div className="space-y-1">
                   <Label htmlFor="shapeCount" className="text-xs font-medium">Shape Count ({shapeCount})</Label>
                  <Slider id="shapeCount" min={1} max={100} step={1} value={[shapeCount]} onValueChange={(val) => setShapeCount(val[0])} />
               </div>
               <div className="space-y-1">
                   <Label htmlFor="edgePointCount" className="text-xs font-medium">Edge Points ({edgePointCount})</Label>
                  <Slider id="edgePointCount" min={5} max={50} step={1} value={[edgePointCount]} onValueChange={(val) => setEdgePointCount(val[0])} />
               </div>
               <div className="space-y-1">
                   <Label htmlFor="minBlobSize" className="text-xs font-medium">Min Size ({minBlobSize})</Label>
                  <Slider id="minBlobSize" min={5} max={30} step={1} value={[minBlobSize]} onValueChange={(val) => setMinBlobSize(val[0])} />
               </div>
                <div className="space-y-1">
                    <Label htmlFor="repelDistance" className="text-xs font-medium">Repel Dist ({repelDistance})</Label>
                   <Slider id="repelDistance" min={1} max={50} step={1} value={[repelDistance]} onValueChange={(val) => setRepelDistance(val[0])} />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="springTension" className="text-xs font-medium">Tension ({springTension.toFixed(2)})</Label>
                   <Slider id="springTension" min={0.01} max={1} step={0.01} value={[springTension]} onValueChange={(val) => setSpringTension(val[0])} />
                </div>
                {/* *** Adjusted Slider Range/Step for Interaction Strength *** */}
                 <div className="space-y-1">
                    <Label htmlFor="interactionStrength" className="text-xs font-medium">Interaction ({interactionStrength.toFixed(3)})</Label>
                    <Slider id="interactionStrength" min={0.001} max={0.05} step={0.001} value={[interactionStrength]} onValueChange={(val) => setInteractionStrength(val[0])} />
                </div>
                 <div className="space-y-1">
                    <Label htmlFor="gravity" className="text-xs font-medium">Gravity ({gravity.toFixed(2)})</Label>
                   <Slider id="gravity" min={-0.5} max={0.5} step={0.01} value={[gravity]} onValueChange={(val) => setGravity(val[0])} />
                </div>
                 {/* *** Adjusted Slider Range/Step for Damping *** */}
                <div className="space-y-1">
                    <Label htmlFor="damping" className="text-xs font-medium">Damping ({damping.toFixed(3)})</Label>
                   <Slider id="damping" min={0.9} max={0.999} step={0.001} value={[damping]} onValueChange={(val) => setDamping(val[0])} />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="maxExpansionFactor" className="text-xs font-medium">Max Expand ({maxExpansionFactor.toFixed(1)}x)</Label>
                    <Slider id="maxExpansionFactor" min={1} max={5} step={0.1} value={[maxExpansionFactor]} onValueChange={(val) => setMaxExpansionFactor(val[0])} />
                </div>
           </div>

           {/* Container/Appearance Settings */}
          <div className="space-y-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
             {/* ... Container settings remain the same ... */}
              <div className="flex items-center justify-between">
                 <Label htmlFor="containerMargin" className="text-xs font-medium">Container Margin</Label>
                 <input type="number" id="containerMargin" min={0} max={100} value={containerMargin} onChange={(e) => setContainerMargin(Math.max(0, +e.target.value))} className="w-16 text-center border rounded bg-transparent dark:border-neutral-700 px-1 text-sm"/>
             </div>
              <div className="flex items-center justify-between">
                 <Label htmlFor="show-border" className="text-sm">Show Border</Label>
                <Switch id="show-border" checked={showBorder} onCheckedChange={setShowBorder} />
             </div>
             <div className="flex items-center justify-between">
                <Label htmlFor="rounded-container" className="text-sm">Rounded Container</Label>
                <Switch id="rounded-container" checked={isRoundedContainer} onCheckedChange={setIsRoundedContainer} />
             </div>
          </div>

           {/* Restricted Area Settings */}
          <div className="space-y-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
               {/* ... Restricted area settings remain the same ... */}
                <div className="flex items-center justify-between">
                 <Label htmlFor="restricted-area-enable" className="text-sm">Enable Obstacle</Label>
                 <Switch id="restricted-area-enable" checked={restrictedAreaEnabled} onCheckedChange={setRestrictedAreaEnabled} />
              </div>
              {restrictedAreaEnabled && (
                  <>
                     <div className="flex items-center justify-between">
                         <Label className="text-xs font-medium">Obstacle Shape</Label>
                         <select value={restrictedAreaShape} onChange={(e) => setRestrictedAreaShape(e.target.value as 'rectangle' | 'letter')} className="text-xs border rounded bg-transparent dark:border-neutral-700 px-1 py-0.5">
                              <option value="rectangle">Rectangle</option>
                              <option value="letter">Letter</option>
                          </select>
                      </div>
                       <div className="space-y-1">
                          <Label htmlFor="restrictedAreaSize" className="text-xs font-medium">Obstacle Size ({restrictedAreaSize})</Label>
                           <Slider id="restrictedAreaSize" min={20} max={200} step={5} value={[restrictedAreaSize]} onValueChange={(val) => setRestrictedAreaSize(val[0])} />
                      </div>
                      {restrictedAreaShape === 'letter' && (
                           <div className="flex items-center justify-between">
                              <Label htmlFor="restrictedAreaLetter" className="text-xs font-medium">Letter</Label>
                              <input type="text" id="restrictedAreaLetter" maxLength={1} value={restrictedAreaLetter} onChange={(e) => setRestrictedAreaLetter(e.target.value.toUpperCase() || 'A')} className="w-10 text-center border rounded bg-transparent dark:border-neutral-700 px-1 text-sm uppercase"/>
                          </div>
                      )}
                  </>
               )}
          </div>

          {/* Color Settings */}
          <Tabs defaultValue="light-mode" className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
            {/* ... Color settings remain the same ... */}
             <TabsList className="grid w-full grid-cols-2 mb-3">
              <TabsTrigger value="light-mode">Light Colors</TabsTrigger>
              <TabsTrigger value="dark-mode">Dark Colors</TabsTrigger>
            </TabsList>
            <TabsContent value="light-mode" className="space-y-3">
               <div className="flex items-center justify-between">
                 <Label htmlFor="bg-color" className="text-xs">Background</Label>
                 <input type="color" id="bg-color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border dark:border-neutral-700"/>
               </div>
                <div className="flex items-center justify-between">
                   <Label htmlFor="blob-fill" className="text-xs">Blob Fill</Label>
                   <input type="color" id="blob-fill" value={blobFillColor} onChange={(e) => setBlobFillColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border dark:border-neutral-700"/>
                </div>
                <div className="flex items-center justify-between">
                   <Label htmlFor="blob-border" className="text-xs">Blob Border</Label>
                   <input type="color" id="blob-border" value={blobBorderColor} onChange={(e) => setBlobBorderColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border dark:border-neutral-700"/>
                </div>
                 <div className="space-y-1">
                   <Label htmlFor="blobFillOpacity" className="text-xs font-medium">Fill Opacity ({blobFillOpacity.toFixed(2)})</Label>
                   <Slider id="blobFillOpacity" min={0} max={1} step={0.05} value={[blobFillOpacity]} onValueChange={(val) => setBlobFillOpacity(val[0])}/>
               </div>
            </TabsContent>
            <TabsContent value="dark-mode" className="space-y-3">
                <div className="flex items-center justify-between">
                   <Label htmlFor="dark-bg-color" className="text-xs">Background</Label>
                   <input type="color" id="dark-bg-color" value={darkBackgroundColor} onChange={(e) => setDarkBackgroundColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border dark:border-neutral-700"/>
                </div>
                <div className="flex items-center justify-between">
                   <Label htmlFor="dark-blob-fill" className="text-xs">Blob Fill</Label>
                   <input type="color" id="dark-blob-fill" value={darkBlobFillColor} onChange={(e) => setDarkBlobFillColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border dark:border-neutral-700"/>
                </div>
                 <div className="flex items-center justify-between">
                   <Label htmlFor="dark-blob-border" className="text-xs">Blob Border</Label>
                   <input type="color" id="dark-blob-border" value={darkBlobBorderColor} onChange={(e) => setDarkBlobBorderColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border dark:border-neutral-700"/>
                </div>
                 <div className="space-y-1">
                    <Label htmlFor="darkBlobFillOpacity" className="text-xs font-medium">Fill Opacity ({darkBlobFillOpacity.toFixed(2)})</Label>
                    <Slider id="darkBlobFillOpacity" min={0} max={1} step={0.05} value={[darkBlobFillOpacity]} onValueChange={(val) => setDarkBlobFillOpacity(val[0])}/>
               </div>
            </TabsContent>
          </Tabs>

          {/* Restart Button */}
          <Button onClick={handleRestart} className="w-full mt-4">Restart Simulation</Button>
        </div>
      </Card>
    </div>
  );
}