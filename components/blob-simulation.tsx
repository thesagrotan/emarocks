"use client"

import { useEffect, useRef, useState } from "react"
import { Download, Pause, Play, Plus, Eraser } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { Vector2 } from "three"
import { useLayoutEffect } from "react"

// Import refactored components and types
import { SimulationControls } from "./blob-simulation/simulation-controls"
import { Blob } from "./blob-simulation/blob"
import { hexToRgba, poissonDiskSampling, drawLetter } from "./blob-simulation/utils"
import { SimulationParams, SimulationColors, RestrictedAreaParams } from "./blob-simulation/types"

// Safely access window properties with a function that only runs client-side
const getDevicePixelRatio = () => {
  if (typeof window !== 'undefined') {
    return window.devicePixelRatio || 1;
  }
  return 1;
};

// --- React Component ---
export function BlobSimulation() {
  // --- State ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const animationFrameIdRef = useRef<number | null>(null);
  const blobsRef = useRef<Blob[]>([]);
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  // Simulation parameters as a single state object
  const [simulationParams, setSimulationParams] = useState<SimulationParams>({
    // Simulation Parameters - Default values
    shapeCount: 15,
    edgePointCount: 25,
    minBlobSize: 10,
    repelDistance: 15,
    springTension: 0.2,
    interactionStrength: 0.015,
    gravity: 0,
    damping: 0.98,
    maxExpansionFactor: 2.5,
    speed: 1,

    // Container/Appearance
    containerMargin: 20,
    isRoundedContainer: false,
    showBorder: true,
    backgroundColor: "#aac9ca",
    darkBackgroundColor: "#1a2b2f",
    blobFillColor: "#ffffff",
    blobFillOpacity: 0.3,
    darkBlobFillColor: "#000000",
    darkBlobFillOpacity: 0.3,
    blobBorderColor: "#466e91",
    darkBlobBorderColor: "#77e4cb",

    // Interaction/Tools
    toolMode: null,

    // Restricted Area / Static Obstacle
    restrictedAreaEnabled: true,
    restrictedAreaShape: 'letter',
    restrictedAreaSize: 100,
    restrictedAreaLetter: 'A',
    restrictedAreaMargin: 30,
  });

  // --- Handle parameter updates ---
  const handleParamChange = (key: keyof SimulationParams, value: any) => {
    setSimulationParams(prev => ({ ...prev, [key]: value }));
  };

  // Calculate restricted area params based on state
  const calculateRestrictedAreaParams = (canvasWidth: number, canvasHeight: number): RestrictedAreaParams | undefined => {
    const { restrictedAreaEnabled, restrictedAreaSize, restrictedAreaLetter, restrictedAreaMargin } = simulationParams;
    
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

  // Mount detection - crucial for handling browser APIs safely
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // --- Effects ---
  // Only initialize simulation after component is mounted
  useEffect(() => {
    if (!isMounted) return;
    
    // Wait a frame to ensure the canvas element is fully ready
    const timer = setTimeout(() => {
      initializeSimulation();
      setIsInitialized(true);
    }, 0);

    return () => {
      clearTimeout(timer);
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
      blobsRef.current = [];
      setIsAnimating(false);
    };
  }, [isMounted]);

  useEffect(() => {
    if (!isInitialized || !isMounted) return;
    handleRestart();
  }, [simulationParams.shapeCount, simulationParams.edgePointCount, simulationParams.minBlobSize, isInitialized, isMounted]);

  useEffect(() => {
    if (!isInitialized || !isMounted) return;
    draw();
  }, [
    theme, 
    resolvedTheme,
    simulationParams.isRoundedContainer, 
    simulationParams.showBorder, 
    simulationParams.containerMargin,
    simulationParams.backgroundColor, 
    simulationParams.darkBackgroundColor, 
    simulationParams.blobFillColor, 
    simulationParams.blobFillOpacity,
    simulationParams.darkBlobFillColor, 
    simulationParams.darkBlobFillOpacity, 
    simulationParams.blobBorderColor, 
    simulationParams.darkBlobBorderColor,
    simulationParams.restrictedAreaEnabled, 
    simulationParams.restrictedAreaShape, 
    simulationParams.restrictedAreaSize, 
    simulationParams.restrictedAreaLetter,
    isInitialized,
    isMounted
  ]);

  // --- Core Functions ---
  const initializeSimulation = () => {
    try {
      console.log("Initializing simulation...");
      const canvas = canvasRef.current;
      if (!canvas) {
        console.warn("Canvas ref is not available");
        return;
      }
      
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.warn("Could not get 2D context from canvas");
        return;
      }

      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      setIsAnimating(false);

      const { 
        shapeCount, 
        edgePointCount, 
        minBlobSize, 
        repelDistance, 
        containerMargin 
      } = simulationParams;
      
      const canvasSize = 512;
      const dpi = getDevicePixelRatio();
      
      // Set canvas dimensions
      canvas.width = canvasSize * dpi;
      canvas.height = canvasSize * dpi;
      canvas.style.width = `${canvasSize}px`;
      canvas.style.height = `${canvasSize}px`;
      ctx.setTransform(dpi, 0, 0, dpi, 0, 0);

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
      } catch (error) { 
        console.error("PDS Error:", error); 
      }

      if (points.length < shapeCount) {
        console.warn(`PDS Warning: Generated ${points.length}/${shapeCount} points.`);
      }

      blobsRef.current = points.map(([x, y]) => new Blob(
        x + containerMargin, y + containerMargin,
        edgePointCount, minBlobSize, repelDistance
      ));

      console.log("Initialization complete.");
      draw();
    } catch (error) {
      console.error("Error in initializeSimulation:", error);
    }
  };

  const draw = () => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { 
        backgroundColor, darkBackgroundColor,
        blobFillColor, blobFillOpacity,
        darkBlobFillColor, darkBlobFillOpacity,
        blobBorderColor, darkBlobBorderColor,
        showBorder, containerMargin, isRoundedContainer,
        restrictedAreaEnabled, restrictedAreaShape
      } = simulationParams;

      const colors: SimulationColors = {
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

      const dpi = getDevicePixelRatio();
      const canvasWidth = 512;
      const canvasHeight = 512;

      // Reset transform and clear canvas
      ctx.setTransform(dpi, 0, 0, dpi, 0, 0);
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
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
          if (radius > 0) {
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
      if (restrictedAreaEnabled && restrictedAreaParams) {
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

  // Rest of the functions remain mostly the same, with added error handling
  const animate = () => {
    try {
      if (!canvasRef.current || !isMounted) { 
        setIsAnimating(false); 
        return; 
      }
      
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) { 
        setIsAnimating(false); 
        return; 
      }

      const { 
        springTension, containerMargin, isRoundedContainer,
        interactionStrength, maxExpansionFactor,
        gravity, damping, restrictedAreaEnabled,
        restrictedAreaShape
      } = simulationParams;
      
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
            gravity, damping,
            shapeType, shapeParams, ctx
          );
        }
      });

      // --- Draw Step ---
      draw();

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
    if (!isMounted) return;
    
    setIsAnimating(prev => {
      const nextIsAnimating = !prev;
      if (nextIsAnimating) {
        console.log("Animation starting");
        if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
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
    if (!isMounted) return;
    
    console.log("Restarting simulation...");
    // Stop animation reliably
    if (isAnimating) {
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
      setIsAnimating(false);
    }
    // Clear blobs visually
    blobsRef.current = [];
    // Use requestAnimationFrame for the redraw to avoid race conditions
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        draw(); // Draw empty canvas
        // Re-initialize after the draw confirms canvas is clear
        setTimeout(() => {
          initializeSimulation();
        }, 50);
      });
    }
  };

  const downloadSVG = () => {
    if (!isMounted) return;
    
    try {
      console.log("Generating SVG...");
      const { 
        backgroundColor, darkBackgroundColor,
        blobFillColor, blobFillOpacity,
        darkBlobFillColor, darkBlobFillOpacity,
        blobBorderColor, darkBlobBorderColor,
        showBorder, containerMargin, isRoundedContainer,
        restrictedAreaEnabled, restrictedAreaShape
      } = simulationParams;
      
      const canvasWidth = 512;
      const canvasHeight = 512;

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

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMounted) return;
    
    try {
      const canvas = canvasRef.current;
      const { toolMode, containerMargin, minBlobSize, repelDistance, edgePointCount } = simulationParams;
      
      if (!canvas || !toolMode) return;

      const rect = canvas.getBoundingClientRect();
      const dpi = getDevicePixelRatio();
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
        if (simulationParams.restrictedAreaEnabled && restrictedParams) {
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

      setSimulationParams(prev => ({ ...prev, toolMode: null }));
      draw();
    } catch (error) {
      console.error("Error handling canvas click:", error);
    }
  };

  // If component is not mounted yet, render a placeholder to avoid hydration mismatch
  if (!isMounted) {
    return (
      <div className="flex flex-col lg:flex-row gap-6 items-start p-4 md:p-6">
        <div className="relative w-full max-w-[512px] aspect-square flex-shrink-0 mx-auto lg:mx-0">
          <div className="w-full h-full rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <p className="text-neutral-400">Loading simulation...</p>
          </div>
        </div>
        <div className="w-full max-w-[320px] h-[500px] bg-neutral-100 dark:bg-neutral-800 rounded-lg"></div>
      </div>
    );
  }

  // --- JSX ---
  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start p-4 md:p-6">
      {/* Canvas Container */}
      <div className="relative w-full max-w-[512px] aspect-square flex-shrink-0 mx-auto lg:mx-0">
        {/* Canvas Element */}
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className={`block rounded-lg w-full h-full border border-neutral-300 dark:border-neutral-700 ${simulationParams.toolMode ? 'cursor-crosshair' : 'cursor-default'}`}
          style={{ backgroundColor: currentTheme === 'dark' ? simulationParams.darkBackgroundColor : simulationParams.backgroundColor }}
        />
        {/* Canvas Overlays */}
        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center pointer-events-none">
          {/* Play/Pause Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleAnimation}
            className="bg-black/40 text-white hover:bg-black/60 border-none rounded-full pointer-events-auto"
            aria-label={isAnimating ? 'Pause simulation' : 'Play simulation'}
          >
            {isAnimating ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </Button>

          {/* Tool Buttons */}
          <div className="flex gap-2 pointer-events-auto">
            <Button
              variant="outline" 
              size="icon"
              onClick={() => setSimulationParams(prev => ({ 
                ...prev, 
                toolMode: prev.toolMode === 'add' ? null : 'add' 
              }))}
              className={`bg-black/40 text-white hover:bg-black/60 border-none rounded-full ${simulationParams.toolMode === 'add' ? 'ring-2 ring-white' : ''}`}
              aria-label="Add Shape Tool"
            >
              <Plus className="w-5 h-5" />
            </Button>
            <Button
              variant="outline" 
              size="icon"
              onClick={() => setSimulationParams(prev => ({ 
                ...prev, 
                toolMode: prev.toolMode === 'remove' ? null : 'remove' 
              }))}
              className={`bg-black/40 text-white hover:bg-black/60 border-none rounded-full ${simulationParams.toolMode === 'remove' ? 'ring-2 ring-white' : ''}`}
              aria-label="Remove Shape Tool"
            >
              <Eraser className="w-5 h-5" />
            </Button>
          </div>

          {/* Download Button */}
          <Button
            variant="outline" 
            size="icon"
            onClick={downloadSVG}
            className="bg-black/40 text-white hover:bg-black/60 border-none rounded-full pointer-events-auto"
            aria-label="Download as SVG"
          >
            <Download className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      <SimulationControls 
        params={simulationParams} 
        onParamChange={handleParamChange}
        onRestart={handleRestart}
      />
    </div>
  );
}