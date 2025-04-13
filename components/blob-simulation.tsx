"use client"

import { useEffect, useRef, useState } from "react"
import { Download, Pause, Play, Plus, Eraser } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card } from "@/components/ui/card"
import { useTheme } from "next-themes"
import { Vector2 } from "three"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Vector2 and Utility Functions
// Utility Functions
const origin = new Vector2()

// Define a reusable Vector2 instance for temporary calculations
const tempVec = new Vector2();

// Particle Class
class Particle {
  pos: Vector2
  vel: Vector2
  acc: Vector2

  constructor(x: number, y: number) {
    this.pos = new Vector2(x, y)
    this.vel = new Vector2()
    this.acc = new Vector2()
  }

  applyForce(force: Vector2) {
    this.acc.add(force)
  }

  update(canvasWidth: number, canvasHeight: number, margin: number, isRoundedContainer: boolean) {
    this.vel.multiplyScalar(0.98);
    this.vel.add(this.acc);
    this.pos.add(this.vel);

    const canvasCenter = new Vector2(canvasWidth / 2, canvasHeight / 2);
    const circleRadius = (canvasWidth - margin * 2) / 2;

    // Boundary collision detection
    if (isRoundedContainer) {
      // Calculate distance from center
      const distFromCenter = this.pos.distanceTo(canvasCenter);
      if (distFromCenter > circleRadius) {
        // Move the particle to the edge of the circle
        const direction = tempVec.copy(this.pos).sub(canvasCenter).normalize();
        this.pos.copy(direction.multiplyScalar(circleRadius).add(canvasCenter));
        this.vel.multiplyScalar(-0.5); // Bounce with damping
      }
    } else {
      // Existing rectangular boundary checks
      const boundaryLeft = margin;
      const boundaryRight = canvasWidth - margin;
      const boundaryTop = margin;
      const boundaryBottom = canvasHeight - margin;

      // Left boundary
      if (this.pos.x < boundaryLeft) {
        this.pos.x = boundaryLeft;
        this.vel.x *= -0.5; // Bounce with damping
      }

      // Right boundary
      if (this.pos.x > boundaryRight) {
        this.pos.x = boundaryRight;
        this.vel.x *= -0.5; // Bounce with damping
      }

      // Top boundary
      if (this.pos.y < boundaryTop) {
        this.pos.y = boundaryTop;
        this.vel.y *= -0.5; // Bounce with damping
      }

      // Bottom boundary
      if (this.pos.y > boundaryBottom) {
        this.pos.y = boundaryBottom;
        this.vel.y *= -0.5; // Bounce with damping
      }
    }

    this.acc.multiplyScalar(0);
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath()
    ctx.arc(this.pos.x, this.pos.y, 2, 0, Math.PI * 2)
    ctx.fill()
  }
}

// Spring Class
class Spring {
  particleA: Particle
  particleB: Particle
  restLength: number

  constructor(particleA: Particle, particleB: Particle, restLength: number) {
    this.particleA = particleA
    this.particleB = particleB
    this.restLength = restLength
  }

  update(tensionOverride?: number) {
    const tension = tensionOverride !== undefined ? tensionOverride / 10 : 0.002
    const force = tempVec.copy(this.particleA.pos).sub(this.particleB.pos)
    const currentLength = force.length()

    if (currentLength < 1e-6) return

    const stretch = currentLength - this.restLength
    force.normalize()
    force.multiplyScalar(tension * stretch)

    this.particleB.applyForce(force)
    this.particleA.applyForce(force.multiplyScalar(-1))
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath()
    ctx.moveTo(this.particleA.pos.x, this.particleA.pos.y)
    ctx.lineTo(this.particleB.pos.x, this.particleB.pos.y)
    ctx.stroke()
  }
}

// Blob Class
class Blob {
  centre: Vector2
  maxRadius: number
  edgePointCount: number
  particles: Particle[]
  springs: Spring[]
  initialArea: number
  targetArea: number
  repelDistance: number

  constructor(x: number, y: number, edgePointCount: number, startSize: number, repelDistance: number) {
    this.centre = new Vector2(x, y)
    this.maxRadius = startSize
    this.edgePointCount = edgePointCount
    this.particles = []
    this.springs = []
    this.initialArea = Math.PI * startSize * startSize
    if (this.initialArea < 1e-6) this.initialArea = 1
    this.targetArea = this.initialArea
    this.repelDistance = repelDistance
    this.setup()
  }

  setup() {
    // Reseting state
    this.particles.length = 0 
    this.springs.length = 0

    const initialSpringLength = this.maxRadius * Math.sin(Math.PI / this.edgePointCount) * 2

    for (let i = 0; i < this.edgePointCount; i++) {
      const angle = (i / this.edgePointCount) * Math.PI * 2
      const x = Math.cos(angle) * this.maxRadius + this.centre.x
      const y = Math.sin(angle) * this.maxRadius + this.centre.y

      this.particles.push(new Particle(x, y))

      if (i > 0) {
        this.springs.push(new Spring(this.particles[i], this.particles[i - 1], initialSpringLength))
      }
    }

    this.springs.push(new Spring(this.particles[0], this.particles[this.edgePointCount - 1], initialSpringLength))
  }


  updateMaxRadius() {
    let maxDistSq = 0

    this.particles.forEach((particle) => {
      const distSq = this.centre.distanceToSquared(particle.pos)
      if (distSq > maxDistSq) maxDistSq = distSq
    })

    this.maxRadius = Math.sqrt(maxDistSq)
  }

  // Refine the repelBlobs method to ensure shapes maintain their structure while preventing overlap
  repelBlobs(blobs: Blob[]) {
    this.updateMaxRadius();

    this.particles.forEach((particleA) => {
      blobs.forEach((blobB) => {
        if (this === blobB) return;

        const distBetweenCenters = this.centre.distanceTo(blobB.centre);

        if (distBetweenCenters > this.maxRadius + blobB.maxRadius) return;

        blobB.particles.forEach((particleB) => {
          tempVec.copy(particleA.pos).sub(particleB.pos);
          const dist = tempVec.length();

          if (dist > 1e-6 && dist < this.repelDistance) {
            const overlap = this.repelDistance - dist;
            const forceMagnitude = overlap * 0.05; // Reduce force magnitude to avoid distortion
            tempVec.normalize().multiplyScalar(forceMagnitude);

            particleA.applyForce(tempVec);
            particleB.applyForce(tempVec.multiplyScalar(-1));
          }
        });
      });
    });
  }

  get area() {
    let total = 0

    for (let i = 0; i < this.edgePointCount; i++) {
      const { x: x1, y: y1 } = this.particles[i].pos
      const { x: x2, y: y2 } = this.particles[(i + 1) % this.edgePointCount].pos

      total += x1 * y2 - x2 * y1
    }

    return Math.abs(total / 2)
  }

  grow() {
    if (this.initialArea <= 0) return

    const maxTargetArea = this.initialArea * 3

    if (this.targetArea < maxTargetArea) {
      this.targetArea *= 1.002

      if (this.targetArea > maxTargetArea) {
        this.targetArea = maxTargetArea
      }
    }
  }

  maintainPressure() {
    const currentArea = this.area

    if (currentArea < 1e-6) return

    const pressure = this.targetArea / currentArea
    const forceSize = (pressure - 1) * 0.1

    this.particles.forEach((particle, i) => {
      const left = this.particles[(i + this.edgePointCount - 1) % this.edgePointCount]
      const right = this.particles[(i + 1) % this.edgePointCount]

      const force = tempVec.copy(left.pos).sub(right.pos)

      if (force.lengthSq() < 1e-6) return

      force.rotateAround(origin, Math.PI / 2)
      force.normalize()
      force.multiplyScalar(forceSize)

      particle.applyForce(force)
    })
  }

  draw(ctx: CanvasRenderingContext2D, fillColor: string, strokeColor: string) {
    ctx.beginPath()
    ctx.moveTo(this.particles[0].pos.x, this.particles[0].pos.y)

    for (let i = 1; i <= this.edgePointCount; i++) {
      ctx.lineTo(this.particles[i % this.edgePointCount].pos.x, this.particles[i % this.edgePointCount].pos.y)
    }

    ctx.closePath()
    ctx.fillStyle = fillColor
    ctx.fill()
    ctx.strokeStyle = strokeColor
    ctx.stroke()
  }

  // Get SVG path data for this blob
  getSVGPath(): string {
    if (this.particles.length === 0) return ""

    let path = `M ${this.particles[0].pos.x} ${this.particles[0].pos.y}`

    for (let i = 1; i <= this.edgePointCount; i++) {
      const particle = this.particles[i % this.edgePointCount]
      path += ` L ${particle.pos.x} ${particle.pos.y}`
    }

    path += " Z"
    return path
  }

  update(
    blobs: Blob[],
    springTension: number,
    canvasWidth: number,
    canvasHeight: number,
    margin: number,
    isRoundedContainer: boolean
  ) {
    this.repelBlobs(blobs);
    this.maintainPressure();
    this.grow();

    const center = new Vector2(canvasWidth / 2, canvasHeight / 2);
    const maxDistance = (canvasWidth - margin * 2) / 2;

    this.particles.forEach((particle) => {
      particle.update(canvasWidth, canvasHeight, margin, isRoundedContainer);

      if (isRoundedContainer) {
        // Ensure particles stay within the circle
        const distanceFromCenter = center.distanceTo(particle.pos);
        if (distanceFromCenter > maxDistance) {
          const direction = tempVec.copy(particle.pos).sub(center).normalize();
          const targetPosition = direction.multiplyScalar(maxDistance).add(center);
          particle.pos.lerp(targetPosition, 0.1); // Smoothly move the particle towards the boundary
          particle.vel.multiplyScalar(0.5); // Apply damping to stabilize motion
        }
      }
    });

    this.springs.forEach((spring) => spring.update(springTension));
  }
}

// Poisson Disk Sampling Function
function poissonDiskSampling(width: number, height: number, minDist: number, k = 30, maxPoints?: number) {
  const radiusSq = minDist * minDist
  const cellSize = minDist / Math.SQRT2

  const gridWidth = Math.ceil(width / cellSize)
  const gridHeight = Math.ceil(height / cellSize)

  const grid = new Array(gridWidth * gridHeight).fill(null)
  const points: Vector2[] = []
  const active: Vector2[] = []

  function gridCoords(p: Vector2) {
    return {
      x: Math.floor(p.x / cellSize),
      y: Math.floor(p.y / cellSize),
    }
  }

  function insertPoint(p: Vector2) {
    const coords = gridCoords(p)
    grid[coords.x + coords.y * gridWidth] = p
    points.push(p)
    active.push(p)
  }

  function isFarEnough(p: Vector2) {
    const coords = gridCoords(p)

    const minX = Math.max(0, coords.x - 2)
    const minY = Math.max(0, coords.y - 2)
    const maxX = Math.min(gridWidth - 1, coords.x + 2)
    const maxY = Math.min(gridHeight - 1, coords.y + 2)

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const neighbor = grid[x + y * gridWidth]

        if (neighbor) {
          if (p.distanceToSquared(neighbor) < radiusSq) return false
        }
      }
    }

    return true
  }

  if (width <= 0 || height <= 0) return []

  const p0 = new Vector2(Math.random() * width, Math.random() * height)
  insertPoint(p0)

  while (active.length > 0 && (!maxPoints || points.length < maxPoints)) {
    const activeIndex = Math.floor(Math.random() * active.length)
    const currentPoint = active[activeIndex]
    let foundCandidate = false

    for (let i = 0; i < k; i++) {
      if (maxPoints && points.length >= maxPoints) break

      const angle = Math.random() * Math.PI * 2
      const radius = minDist * (1 + Math.random())

      const candidate = new Vector2(
        currentPoint.x + Math.cos(angle) * radius,
        currentPoint.y + Math.sin(angle) * radius,
      )

      if (
        candidate.x >= 0 &&
        candidate.x < width &&
        candidate.y >= 0 &&
        candidate.y < height &&
        isFarEnough(candidate)
      ) {
        insertPoint(candidate)
        foundCandidate = true
      }
    }

    if (!foundCandidate) {
      active.splice(activeIndex, 1)
    }
  }

  return points.map((p) => [p.x, p.y])
}

// Function to convert hex to rgba
function hexToRgba(hex: string, alpha = 1): string {
  // Remove the # if present
  hex = hex.replace("#", "")

  // Parse the hex values
  let r, g, b
  if (hex.length === 3) {
    r = Number.parseInt(hex[0] + hex[0], 16)
    g = Number.parseInt(hex[1] + hex[1], 16)
    b = Number.parseInt(hex[2] + hex[2], 16)
  } else {
    r = Number.parseInt(hex.substring(0, 2), 16)
    g = Number.parseInt(hex.substring(2, 4), 16)
    b = Number.parseInt(hex.substring(4, 6), 16)
  }

  // Return rgba string
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function BlobSimulation() {
  const [minBlobSize, setMinBlobSize] = useState(10)
  const [isRoundedContainer, setIsRoundedContainer] = useState(false)  // Move this line inside the function
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [edgePointCount, setEdgePointCount] = useState(25)
  const [repelDistance, setRepelDistance] = useState(20)
  const [springTension, setSpringTension] = useState(0.2)
  const [shapeCount, setShapeCount] = useState(15)
  const { theme } = useTheme()

  const blobsRef = useRef<Blob[]>([])
  const animationFrameIdRef = useRef<number | null>(null);

  const [showBorder, setShowBorder] = useState(true)
  const [backgroundColor, setBackgroundColor] = useState("#aac9ca")
  const [darkBackgroundColor, setDarkBackgroundColor] = useState("#3f757d")
  const [blobFillColor, setBlobFillColor] = useState("#ffffff")
  const [blobFillOpacity, setBlobFillOpacity] = useState(0.2)
  const [darkBlobFillColor, setDarkBlobFillColor] = useState("#000000")
  const [darkBlobFillOpacity, setDarkBlobFillOpacity] = useState(0.2)
  const [blobBorderColor, setBlobBorderColor] = useState("#466e91")
  const [darkBlobBorderColor, setDarkBlobBorderColor] = useState("#77e4cb")

  const [toolMode, setToolMode] = useState<'add' | 'remove' | null>(null);

  const [gravity, setGravity] = useState(0.1);
  const [damping, setDamping] = useState(0.98);

  const initializeSimulation = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    console.log(`Initializing simulation with ${shapeCount} shapes...`);

    // Define canvas size
    const canvasSize = 512;

    // Define margin
    const margin = 100;

    // Define logical space for blob distribution (canvas size minus margins)
    const logicalWidth = canvasSize - margin * 2;
    const logicalHeight = canvasSize - margin * 2;

    // Calculate minDist for the logical space
    const initialSize = minBlobSize; // Use the minBlobSize state instead of hardcoding
    const minBlobDist = initialSize * 2 * 1.2; // diameter + 20% spacing (~48)

    console.log(`Sampling area: ${logicalWidth}x${logicalHeight}, Min dist: ${minBlobDist.toFixed(1)}`);

    // Generate points in the logical space, limited by shapeCount
    const generatedPoints = poissonDiskSampling(
      logicalWidth,
      logicalHeight,
      minBlobDist,
      30,
      shapeCount
    );

    console.log(`Generated ${generatedPoints.length} points.`);

    // Create blobs using generated points, and add margin offset to position them correctly in the canvas
    blobsRef.current = generatedPoints.map(([x, y]) => {
      // Add margin to position the blobs in the center of the canvas
      let adjustedX = x + margin;
      let adjustedY = y + margin;

      // Ensure blobs are initialized within the circle if rounded container is selected
      if (isRoundedContainer) {
        const centerX = canvasSize / 2;
        const centerY = canvasSize / 2;
        const maxRadius = (canvasSize - margin * 2) / 2;

        const dx = adjustedX - centerX;
        const dy = adjustedY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > maxRadius) {
          const scale = maxRadius / distance;
          adjustedX = centerX + dx * scale;
          adjustedY = centerY + dy * scale;
        }
      }

      return new Blob(adjustedX, adjustedY, edgePointCount, initialSize, repelDistance);
    });

    console.log("Initialization complete, calling draw...");
    draw();
  }

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    try {
      const currentTheme = theme || "light"
      const colors = {
        bg: currentTheme === "dark" ? darkBackgroundColor : backgroundColor,
        fg: currentTheme === "dark" ? "#f6fefa" : "#04050c",
        accent: currentTheme === "dark" ? darkBlobBorderColor : blobBorderColor,
        fill:
          currentTheme === "dark"
            ? hexToRgba(darkBlobFillColor, darkBlobFillOpacity)
            : hexToRgba(blobFillColor, blobFillOpacity),
      }

      const dpi = window.devicePixelRatio || 1
      const canvasWidth = 512
      const canvasHeight = 512

      canvas.width = canvasWidth * dpi
      canvas.height = canvasHeight * dpi
      canvas.style.width = `${canvasWidth}px`
      canvas.style.height = `${canvasHeight}px`

      // Apply DPI scaling
      ctx.setTransform(dpi, 0, 0, dpi, 0, 0)

      ctx.fillStyle = colors.bg
      ctx.fillRect(0, 0, canvasWidth, canvasHeight) // Clear background

      // Draw container boundary if enabled and handle rounded option
      if (showBorder) {
        const margin = 100
        ctx.strokeStyle = colors.accent
        ctx.lineWidth = 2
        if (isRoundedContainer) {
          const radius = (canvasWidth - margin * 2) / 2
          ctx.beginPath()
          ctx.arc(canvasWidth / 2, canvasHeight / 2, radius, 0, Math.PI * 2)
          ctx.stroke()
        } else {
          ctx.strokeRect(margin, margin, canvasWidth - margin * 2, canvasHeight - margin * 2)
        }
      }

      // Draw blobs
      if (blobsRef.current && blobsRef.current.length > 0) {
        blobsRef.current.forEach((blob) => {
          if (blob && typeof blob.draw === "function") {
            blob.draw(ctx, colors.fill, colors.accent)
          }
        })
      }
    } catch (error) {
      console.error("Error during draw:", error)
      if (isAnimating) {
        cancelAnimationFrame(animationFrameIdRef.current!)
        setIsAnimating(false)
      }
    }
  }

  const animate = () => {
    if (!isAnimating) return

    try {
      const canvasWidth = 512
      const canvasHeight = 512
      const margin = 100

      blobsRef.current.forEach((blob) => {
        if (blob && typeof blob.update === "function") {
          blob.update(blobsRef.current, springTension, canvasWidth, canvasHeight, margin, isRoundedContainer)
        }
      })

      draw()
      animationFrameIdRef.current = requestAnimationFrame(animate)
    } catch (error) {
      console.error("Error during animation update:", error)
      cancelAnimationFrame(animationFrameIdRef.current!)
      setIsAnimating(false)
    }
  }

  const toggleAnimation = () => {
    const newIsAnimating = !isAnimating
    setIsAnimating(newIsAnimating)

    if (newIsAnimating) {
      console.log("Animation started")
      animationFrameIdRef.current = requestAnimationFrame(animate)
    } else {
      console.log("Animation stopped")
      cancelAnimationFrame(animationFrameIdRef.current!)
    }
  }

  const handleEdgePointCountChange = (value: number[]) => {
    setEdgePointCount(value[0])
    initializeSimulation()

    if (isAnimating) {
      cancelAnimationFrame(animationFrameIdRef.current!)
      animationFrameIdRef.current = requestAnimationFrame(animate)
    }
  }

  const handleRepelDistanceChange = (value: number[]) => {
    const newRepelDist = value[0]
    setRepelDistance(newRepelDist)

    blobsRef.current.forEach((blob) => {
      blob.repelDistance = newRepelDist
    })

    if (!isAnimating) draw()
  }

  const handleSpringTensionChange = (value: number[]) => {
    setSpringTension(value[0])
    if (!isAnimating) draw()
  }

  const handleShapeCountChange = (value: number[]) => {
    setShapeCount(value[0])
    initializeSimulation()

    if (isAnimating) {
      cancelAnimationFrame(animationFrameIdRef.current!)
      animationFrameIdRef.current = requestAnimationFrame(animate)
    }
  }

  const handleRestart = () => {
    console.log("Restart clicked")

    if (isAnimating) {
      cancelAnimationFrame(animationFrameIdRef.current!)
      setIsAnimating(false)
    }

    initializeSimulation()
  }

  const downloadSVG = () => {
    const canvasWidth = 512
    const canvasHeight = 512
    const margin = 100
    const currentTheme = theme || "light"

    const colors = {
      bg: currentTheme === "dark" ? darkBackgroundColor : backgroundColor,
      accent: currentTheme === "dark" ? darkBlobBorderColor : blobBorderColor,
      fill:
        currentTheme === "dark"
          ? hexToRgba(darkBlobFillColor, darkBlobFillOpacity)
          : hexToRgba(blobFillColor, blobFillOpacity),
    }

    // Create SVG content
    let svgContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${canvasWidth}" height="${canvasHeight}" fill="${colors.bg}" />
`

    // Add container boundary if enabled
    if (showBorder) {
      svgContent += `  <rect x="${margin}" y="${margin}" width="${canvasWidth - margin * 2}" height="${canvasHeight - margin * 2}" fill="none" stroke="${colors.accent}" strokeWidth="2" />
`
    }

    // Add blobs
    blobsRef.current.forEach((blob) => {
      const path = blob.getSVGPath()
      svgContent += `  <path d="${path}" fill="${colors.fill}" stroke="${colors.accent}" strokeWidth="1" />
`
    })

    // Close SVG
    svgContent += `</svg>`

    try {
      // Create a download link
      const link = document.createElement("a")

      // Use data URI approach instead of Blob
      const encodedSvg = encodeURIComponent(svgContent)
      link.href = `data:image/svg+xml;charset=utf-8,${encodedSvg}`

      link.download = "blob-simulation.svg"
      link.style.display = "none"
      document.body.appendChild(link)
      link.click()

      // Clean up
      setTimeout(() => {
        document.body.removeChild(link)
      }, 100)
    } catch (error) {
      console.error("Error downloading SVG:", error)
      alert("Failed to download SVG. Please try again.")
    }
  }

  // Refine the logic for adding and removing shapes
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !toolMode) return;
  
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width; // Scale factor for X
    const scaleY = canvas.height / rect.height; // Scale factor for Y
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
  
    if (toolMode === 'add') {
      const newBlob = new Blob(x, y, edgePointCount, minBlobSize, repelDistance);
      newBlob.centre.set(x, y); // Explicitly set the center position
      newBlob.targetArea = Math.PI * minBlobSize * minBlobSize; // Set target area to match initial size
      blobsRef.current.push(newBlob);
    } else if (toolMode === 'remove') {
      blobsRef.current = blobsRef.current.filter((blob) => {
        const dist = blob.centre.distanceTo(new Vector2(x, y));
        return dist > blob.maxRadius;
      });
    }
  
    draw();
  };

  useEffect(() => {
    initializeSimulation()

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current)
      }
    }
  }, [])

  useEffect(() => {
    draw()
  }, [theme])

  useEffect(() => {
    draw()
  }, [
    backgroundColor,
    darkBackgroundColor,
    blobFillColor,
    blobFillOpacity,
    darkBlobFillColor,
    darkBlobFillOpacity,
    blobBorderColor,
    darkBlobBorderColor,
    showBorder,
  ])

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      <div className="relative w-[512px] h-[512px] flex-shrink-0">
        <canvas ref={canvasRef} onClick={handleCanvasClick} className="block rounded-lg w-full h-full bg-[#aac9ca] dark:bg-[#3f757d]" />
        <button
          onClick={toggleAnimation}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 text-2xl w-12 h-12 bg-black/50 rounded-full p-2 cursor-pointer text-white opacity-80 hover:opacity-100 transition-opacity"
          aria-label={isAnimating ? "Pause simulation" : "Play simulation"}
          data-animating={isAnimating}
        >
          {isAnimating ? <Pause className="w-full h-full" /> : <Play className="w-full h-full" />}
        </button>
        <button
          onClick={downloadSVG}
          className="absolute bottom-4 right-4 z-10 bg-black/50 rounded-full p-2 cursor-pointer text-white opacity-80 hover:opacity-100 transition-opacity"
          aria-label="Download as SVG"
        >
          <Download className="w-5 h-5" />
        </button>
        <button
          onClick={() => setToolMode('add')}
          className="absolute bottom-4 right-20 z-10 bg-black/50 rounded-full p-2 cursor-pointer text-white opacity-80 hover:opacity-100 transition-opacity"
          aria-label="Add Shape"
        >
          <Plus className="w-5 h-5" />
        </button>
        <button
          onClick={() => setToolMode('remove')}
          className="absolute bottom-4 right-36 z-10 bg-black/50 rounded-full p-2 cursor-pointer text-white opacity-80 hover:opacity-100 transition-opacity"
          aria-label="Remove Shape"
        >
          <Eraser className="w-5 h-5" />
        </button>
      </div>

      <Card className="bg-[rgba(244,245,245,0.8)] dark:bg-[rgba(61,73,81,0.8)] border-[rgba(188,210,203,0.5)] dark:border-[rgba(61,73,81,0.5)] p-4 rounded-lg w-[280px] flex-shrink-0 shadow-md">
        <Tabs defaultValue="physics">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="physics">Physics</TabsTrigger>
            <TabsTrigger value="visual">Visual</TabsTrigger>
          </TabsList>

          <TabsContent value="physics" className="space-y-4">
            <div className="text-left">
              <label htmlFor="shapeCount" className="block mb-1 font-medium">
                Number of shapes: {shapeCount}
              </label>
              <Slider
                id="shapeCount"
                min={1}
                max={120}
                step={1}
                value={[shapeCount]}
                onValueChange={handleShapeCountChange}
              />
            </div>

            <div className="text-left">
              <label htmlFor="edgePointCount" className="block mb-1 font-medium">
                Edge points: {edgePointCount}
              </label>
              <Slider
                id="edgePointCount"
                min={10}
                max={50}
                step={5}
                value={[edgePointCount]}
                onValueChange={handleEdgePointCountChange}
              />
            </div>

            <div className="text-left">
              <label htmlFor="repelDistance" className="block mb-1 font-medium">
                Stopping distance: {repelDistance}
              </label>
              <Slider
                id="repelDistance"
                min={5}
                max={50}
                step={5}
                value={[repelDistance]}
                onValueChange={handleRepelDistanceChange}
              />
            </div>

            <div className="text-left">
              <label htmlFor="springTension" className="block mb-1 font-medium">
                Spring tension: {springTension.toFixed(1)}
              </label>
              <Slider
                id="springTension"
                min={0}
                max={1}
                step={0.1}
                value={[springTension]}
                onValueChange={handleSpringTensionChange}
              />
            </div>

            <div className="text-left">
              <label htmlFor="gravity" className="block mb-1 font-medium">
                Gravity: {gravity.toFixed(2)}
              </label>
              <Slider
                id="gravity"
                min={-1}
                max={1}
                step={0.01}
                value={[gravity]}
                onValueChange={(value) => setGravity(value[0])}
              />
            </div>

            <div className="text-left">
              <label htmlFor="damping" className="block mb-1 font-medium">
                Damping: {damping.toFixed(2)}
              </label>
              <Slider
                id="damping"
                min={0}
                max={1}
                step={0.01}
                value={[damping]}
                onValueChange={(value) => setDamping(value[0])}
              />
            </div>

            <Button
              id="restartButton"
              onClick={handleRestart}
              className="w-full mt-4 bg-blue-500 text-white hover:bg-blue-700 dark:bg-[#3f757d] dark:text-[#f6fefa] dark:hover:bg-[#57b7b1] dark:hover:text-[#0e0f11]"
            >
              Restart
            </Button>
          </TabsContent>

          <TabsContent value="visual" className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Switch id="rounded-container" checked={isRoundedContainer} onCheckedChange={setIsRoundedContainer} />
              <Label htmlFor="rounded-container">Rounded Container</Label>
              <Switch id="show-border" checked={showBorder} onCheckedChange={setShowBorder} />
              <Label htmlFor="show-border">Show container border</Label>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Light Mode</h3>

              <div className="space-y-2">
                <div className="text-left">
                  <label htmlFor="minBlobSize" className="block mb-1 font-medium">
                    Minimum Blob Size: {minBlobSize}
                  </label>
                  <Slider
                    id="minBlobSize"
                    min={5}
                    max={50}
                    step={1}
                    value={[minBlobSize]}
                    onValueChange={(value) => setMinBlobSize(value[0])}
                    className="w-24"
                  />
                </div>
                <Label htmlFor="bg-color" className="text-xs block">
                  Background
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="bg-color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-8 h-8 rounded-md cursor-pointer"
                  />
                  <span className="text-xs font-mono">{backgroundColor}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="blob-fill" className="text-xs block">
                  Blob Fill
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="blob-fill"
                    value={blobFillColor}
                    onChange={(e) => setBlobFillColor(e.target.value)}
                    className="w-8 h-8 rounded-md cursor-pointer"
                  />
                  <span className="text-xs font-mono">{blobFillColor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="blob-fill-opacity" className="text-xs">
                    Opacity:
                  </Label>
                  <Slider
                    id="blob-fill-opacity"
                    min={0}
                    max={1}
                    step={0.1}
                    value={[blobFillOpacity]}
                    onValueChange={(value) => setBlobFillOpacity(value[0])}
                    className="w-24"
                  />
                  <span className="text-xs">{blobFillOpacity.toFixed(1)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="blob-border" className="text-xs block">
                  Blob Border
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="blob-border"
                    value={blobBorderColor}
                    onChange={(e) => setBlobBorderColor(e.target.value)}
                    className="w-8 h-8 rounded-md cursor-pointer"
                  />
                  <span className="text-xs font-mono">{blobBorderColor}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-medium">Dark Mode</h3>

              <div className="space-y-2">
                <Label htmlFor="dark-bg-color" className="text-xs block">
                  Background
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="dark-bg-color"
                    value={darkBackgroundColor}
                    onChange={(e) => setDarkBackgroundColor(e.target.value)}
                    className="w-8 h-8 rounded-md cursor-pointer"
                  />
                  <span className="text-xs font-mono">{darkBackgroundColor}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dark-blob-fill" className="text-xs block">
                  Blob Fill
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="dark-blob-fill"
                    value={darkBlobFillColor}
                    onChange={(e) => setDarkBlobFillColor(e.target.value)}
                    className="w-8 h-8 rounded-md cursor-pointer"
                  />
                  <span className="text-xs font-mono">{darkBlobFillColor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="dark-blob-fill-opacity" className="text-xs">
                    Opacity:
                  </Label>
                  <Slider
                    id="dark-blob-fill-opacity"
                    min={0}
                    max={1}
                    step={0.1}
                    value={[darkBlobFillOpacity]}
                    onValueChange={(value) => setDarkBlobFillOpacity(value[0])}
                    className="w-24"
                  />
                  <span className="text-xs">{darkBlobFillOpacity.toFixed(1)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dark-blob-border" className="text-xs block">
                  Blob Border
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="dark-blob-border"
                    value={darkBlobBorderColor}
                    onChange={(e) => setDarkBlobBorderColor(e.target.value)}
                    className="w-8 h-8 rounded-md cursor-pointer"
                  />
                  <span className="text-xs font-mono">{darkBlobBorderColor}</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
