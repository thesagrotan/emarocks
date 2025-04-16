"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Download, Pause, Play, Plus, Eraser } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { Vector2 } from "three"

// Import refactored components and types
import { SimulationControls } from "./blob-simulation/simulation-controls"
import { Blob } from "./blob-simulation/blob"
import { getSimulationColors } from "@/shared/utils" // Removed unused imports
import { SimulationParamsContext } from "./blob-simulation/context"
import { 
  useLetterAreaCalculation, 
  initializeBlobs,
  useBlobSimulationAnimation
} from "./blob-simulation/hooks"
import * as SimulationUtils from "./blob-simulation/utils"
import { SimulationParams, RestrictedAreaParams } from "./blob-simulation/types"

// Safely access window properties with a function that only runs client-side
const getDevicePixelRatio = () => {
  if (typeof window !== 'undefined') {
    return window.devicePixelRatio || 1;
  }
  return 1;
};

const STORAGE_KEY = 'blob-simulation-settings';
const CANVAS_SIZE = 512; // Constant for canvas size to avoid magic numbers

/**
 * The main BlobSimulation component
 * 
 * This component manages the blob physics simulation, handling:
 * - Simulation state and lifecycle
 * - User interaction with the canvas
 * - Parameter controls and real-time updates
 * - Visual rendering of blobs and letter shapes
 */
export function BlobSimulation() {
  // --- Core Refs and State ---
  /**
   * Reference to the canvas HTML element
   * Used for drawing and interaction handling
   */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  /**
   * Reference to the array of blob objects
   * Using a ref instead of state to avoid re-renders on blob updates
   * while allowing direct mutation during animation frames
   */
  const blobsRef = useRef<Blob[]>([]);
  
  /**
   * Whether the simulation has been fully initialized
   * Used to prevent certain effects from running prematurely
   */
  const [isInitialized, setIsInitialized] = useState(false);
  
  /**
   * Whether the component is mounted in the DOM
   * Used to safely handle browser APIs and prevent memory leaks
   */
  const [isMounted, setIsMounted] = useState(false);

  // --- Theme ---
  /**
   * Current theme state from next-themes
   * Used to apply appropriate colors based on theme
   */
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  // --- Simulation Parameters ---
  /**
   * All simulation parameters in a single state object
   * Persisted to localStorage for user preferences
   */
  const [simulationParams, setSimulationParams] = useState<SimulationParams>(() => {
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem(STORAGE_KEY);
      if (savedSettings) {
        try {
          return JSON.parse(savedSettings);
        } catch (e) {
          console.error('Failed to parse saved settings:', e);
        }
      }
    }
    // Return default settings if no saved settings exist
    return {
      // Physics/Blob Properties
      shapeCount: 250,
      edgePointCount: 20,
      minBlobSize: 4,
      repelDistance: 2,
      springTension: 0.35,
      interactionStrength: 0.06,
      gravity: 0,
      damping: 0.8,
      maxExpansionFactor: 1.3,
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
      letterColor: "#000000",
      darkLetterColor: "#FFFFFF",

      // Theme Toggle Button Colors
      themeToggleBgColorLight: "#6C8C9380",
      themeToggleBgColorDark: "#6C8C9380",
      themeToggleIconColorLight: "#04050C",
      themeToggleIconColorDark: "#F6FEFA",
      
      // Interaction/Tools
      toolMode: null,

      // Restricted Area / Static Obstacle
      restrictedAreaEnabled: true,
      restrictedAreaShape: 'letter',
      restrictedAreaSize: 400,
      restrictedAreaLetter: 'A',
      restrictedAreaMargin: 4,
      // For position override (default: centered)
      restrictedAreaX: undefined,
      restrictedAreaY: undefined,
    };
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(simulationParams));
    }
  }, [simulationParams]);

  /**
   * Calculate restricted area parameters based on current state
   * This function converts the raw parameters to actual coordinates and size
   */
  const calculateRestrictedAreaParams = useCallback((canvasWidth: number, canvasHeight: number): RestrictedAreaParams | undefined => {
    const { restrictedAreaEnabled, restrictedAreaSize, restrictedAreaLetter, restrictedAreaMargin, fontFamily, restrictedAreaX, restrictedAreaY } = simulationParams;
    if (!restrictedAreaEnabled) return undefined;
    
    // Use override position if set, otherwise center the letter
    const x = (typeof restrictedAreaX === 'number') 
      ? restrictedAreaX 
      : (canvasWidth / 2) - (restrictedAreaSize / 2);
    const y = (typeof restrictedAreaY === 'number') 
      ? restrictedAreaY 
      : (canvasHeight / 2) - (restrictedAreaSize / 2);
    
    return {
      x,
      y,
      size: restrictedAreaSize,
      margin: restrictedAreaMargin,
      letter: restrictedAreaLetter,
      fontFamily,
    };
  }, [simulationParams]);

  /**
   * Main draw function that renders the current state to the canvas
   * Handles rendering of background, border, letter, and blobs
   */
  const draw = useCallback(() => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { showBorder, containerMargin, isRoundedContainer, restrictedAreaEnabled } = simulationParams;
      
      // Get theme-appropriate colors
      const colors = getSimulationColors(simulationParams, currentTheme);

      const dpi = getDevicePixelRatio();
      const canvasWidth = CANVAS_SIZE;
      const canvasHeight = CANVAS_SIZE;

      // Reset transform and clear canvas
      ctx.setTransform(dpi, 0, 0, dpi, 0, 0);
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.fillStyle = colors.backgroundColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Draw container boundary
      if (showBorder && containerMargin > 0) {
        ctx.strokeStyle = colors.borderColor;
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
      
      // Draw static obstacle/restricted area BEFORE blobs (for visual clarity)
      const restrictedAreaParams = calculateRestrictedAreaParams(canvasWidth, canvasHeight);
      if (restrictedAreaEnabled && restrictedAreaParams) {
        if (restrictedAreaParams.letter) {
          // Get baseline offset for perfect visual centering
          const font = `bold ${restrictedAreaParams.size}px ${simulationParams.fontFamily || "Arial"}`;
          const { baseline } = SimulationUtils.getLetterVisualBounds(restrictedAreaParams.letter, restrictedAreaParams.size, font);

          // Draw the letter visually centered
          const rectCenterX = restrictedAreaParams.x + restrictedAreaParams.size / 2;
          const rectCenterY = restrictedAreaParams.y + restrictedAreaParams.size / 2;
          const rectSize = restrictedAreaParams.size;
          SimulationUtils.drawLetter(
            ctx, 
            restrictedAreaParams.letter,
            rectCenterX,
            rectCenterY,
            rectSize, 
            colors.letterColor,
            restrictedAreaParams.fontFamily
          );

          // Debug crosshair (can be removed in production)
          if (process.env.NODE_ENV === 'development') {
            ctx.save();
            ctx.strokeStyle = '#f00';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(rectCenterX - 10, rectCenterY);
            ctx.lineTo(rectCenterX + 10, rectCenterY);
            ctx.moveTo(rectCenterX, rectCenterY - 10);
            ctx.lineTo(rectCenterX, rectCenterY + 10);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      // Draw blobs AFTER letter so they appear above it visually
      blobsRef.current.forEach((blob) => {
        if (blob?.draw) blob.draw(ctx, colors.blobFill, colors.blobBorder); 
      });
    } catch (error) {
      console.error("Error during draw cycle:", error);
      setIsAnimating(false);
    }
  }, [simulationParams, currentTheme, calculateRestrictedAreaParams]);

  // Mount detection - crucial for handling browser APIs safely
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);
  
  // --- Use our animation hook for all animation-related state and logic ---
  const {
    isAnimating,
    setIsAnimating,
    isLiveEditing,
    toggleAnimation,
    handleLiveParameterUpdate,
    animationFrameIdRef
  } = useBlobSimulationAnimation(
    simulationParams,
    blobsRef,
    canvasRef,
    draw,
    calculateRestrictedAreaParams,
    currentTheme,
    isMounted
  );

  /**
   * Handle parameter updates from the UI controls
   * Determines which updates can be applied live vs. requiring restart
   */
  const handleParamChange = useCallback((key: string, value: any) => {
    // Check if this is a structural parameter that requires reinitialization
    const isStructuralParam = 
      key === 'shapeCount' || 
      key === 'edgePointCount' || 
      key === 'minBlobSize';
    
    // Handle live parameter updates if animation is running and parameter can be updated on-the-fly
    if (isAnimating && !isStructuralParam) {
      handleLiveParameterUpdate(key, value);
    }
    
    // Update the parameter in state
    setSimulationParams(prev => ({ ...prev, [key]: value }));
  }, [isAnimating, handleLiveParameterUpdate]);

  /**
   * Initialize the simulation
   * Sets up the canvas, creates blobs, and prepares for animation
   */
  const initializeSimulation = useCallback(() => {
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

      // Stop any ongoing animation
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      
      const canvasSize = CANVAS_SIZE;
      const dpi = getDevicePixelRatio();
      
      // Set canvas dimensions with proper DPI handling
      canvas.width = canvasSize * dpi;
      canvas.height = canvasSize * dpi;
      canvas.style.width = `${canvasSize}px`;
      canvas.style.height = `${canvasSize}px`;
      ctx.setTransform(dpi, 0, 0, dpi, 0, 0);

      // Get theme-appropriate letter color
      const letterDisplayColor = currentTheme === "dark" 
        ? simulationParams.darkLetterColor 
        : simulationParams.letterColor;
      
      // Calculate restricted area parameters
      const pdsRestrictedArea = calculateRestrictedAreaParams(canvasSize, canvasSize);
      
      // Use the modularized blob initialization utility
      blobsRef.current = initializeBlobs(
        ctx,
        simulationParams,
        canvasSize,
        pdsRestrictedArea,
        letterDisplayColor
      );

      console.log("Initialization complete.");
      draw();
    } catch (error) {
      console.error("Error in initializeSimulation:", error);
    }
  }, [simulationParams, currentTheme, draw, calculateRestrictedAreaParams, animationFrameIdRef]);

  /**
   * Handle restart of the simulation
   * Clears all blobs and reinitializes the simulation
   */
  const handleRestart = useCallback(() => {
    if (!isMounted) return;
    
    console.log("Restarting simulation...");
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
  }, [isMounted, draw, initializeSimulation]);

  // --- Lifecycle Effects ---

  /**
   * Initialize simulation when component is mounted
   * This only runs once after initial mount
   */
  useEffect(() => {
    if (!isMounted) return;
    
    // Wait a frame to ensure the canvas element is fully ready
    const timer = setTimeout(() => {
      initializeSimulation();
      setIsInitialized(true);
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [isMounted, initializeSimulation]);

  /**
   * Restart simulation when structural parameters change
   * Only runs when parameters that require recreating blobs are modified
   */
  useEffect(() => {
    if (!isInitialized || !isMounted) return;
    handleRestart();
  }, [
    simulationParams.shapeCount, 
    simulationParams.edgePointCount, 
    simulationParams.minBlobSize, 
    isInitialized, 
    isMounted,
    handleRestart
  ]);

  /**
   * Update visual appearance without restart
   * Handles changes to visual parameters that don't affect physics
   */
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
    simulationParams.letterColor,
    simulationParams.darkLetterColor,
    simulationParams.restrictedAreaEnabled, 
    simulationParams.restrictedAreaShape, 
    simulationParams.restrictedAreaSize, 
    simulationParams.restrictedAreaLetter,
    simulationParams.fontFamily,
    isInitialized,
    isMounted,
    draw
  ]);

  /**
   * Update drawing when restricted area position changes while not animating
   * Handles manual letter position changes without requiring animation
   */
  useEffect(() => {
    if (!isAnimating && isInitialized && isMounted && (simulationParams.restrictedAreaX !== undefined || simulationParams.restrictedAreaY !== undefined)) {
      draw();
    }
  }, [simulationParams.restrictedAreaX, simulationParams.restrictedAreaY, isAnimating, isInitialized, isMounted, draw]);

  /**
   * Handle arrow key controls for restricted area movement
   * Allows keyboard navigation of the letter position
   */
  useEffect(() => {
    if (!simulationParams.restrictedAreaEnabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const step = event.shiftKey ? 8 : 1;
      let dx = 0, dy = 0;
      
      switch (event.key) {
        case 'ArrowLeft': dx = -step; break;
        case 'ArrowRight': dx = step; break;
        case 'ArrowUp': dy = -step; break;
        case 'ArrowDown': dy = step; break;
        default: return; // Exit for other keys
      }
      
      event.preventDefault();
      
      setSimulationParams(prev => {
        // Calculate initial position if not already set
        const initialX = typeof prev.restrictedAreaX === 'number' 
          ? prev.restrictedAreaX 
          : (CANVAS_SIZE / 2 - prev.restrictedAreaSize / 2);
        
        const initialY = typeof prev.restrictedAreaY === 'number' 
          ? prev.restrictedAreaY 
          : (CANVAS_SIZE / 2 - prev.restrictedAreaSize / 2);
        
        return {
          ...prev,
          restrictedAreaX: initialX + dx,
          restrictedAreaY: initialY + dy,
        };
      });
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [simulationParams.restrictedAreaEnabled, simulationParams.restrictedAreaSize]);

  /**
   * Generate and download an SVG representation of the current simulation state
   * Creates an SVG file with the same visual appearance as the canvas
   */
  const downloadSVG = useCallback(() => {
    if (!isMounted) return;
    
    try {
      console.log("Generating SVG...");
      const { 
        showBorder, containerMargin, isRoundedContainer,
        restrictedAreaEnabled
      } = simulationParams;
      
      const canvasWidth = CANVAS_SIZE;
      const canvasHeight = CANVAS_SIZE;
      const colors = getSimulationColors(simulationParams, currentTheme);

      let svgContent = `<svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg" style="background-color: ${colors.backgroundColor};">`;

      // Add boundary
      if (showBorder && containerMargin > 0) {
        const borderAttrs = `fill="none" stroke="${colors.borderColor}" stroke-width="1"`;
        if (isRoundedContainer) {
          const radius = (Math.min(canvasWidth, canvasHeight) - containerMargin * 2) / 2;
          const centerX = canvasWidth / 2;
          const centerY = canvasHeight / 2;
          svgContent += `<circle cx="${centerX}" cy="${centerY}" r="${radius}" ${borderAttrs} />`;
        } else {
          svgContent += `<rect x="${containerMargin}" y="${containerMargin}" width="${canvasWidth - containerMargin * 2}" height="${canvasHeight - containerMargin * 2}" ${borderAttrs} />`;
        }
      }

      // Add blobs
      blobsRef.current.forEach((blob) => {
        if (blob?.getSVGPath) {
          const path = blob.getSVGPath();
          svgContent += `<path d="${path}" fill="${colors.blobFill}" stroke="${colors.blobBorder}" stroke-width="1" />`;
        }
      });

      // Add letter
      const restrictedAreaParams = calculateRestrictedAreaParams(canvasWidth, canvasHeight);
      if (restrictedAreaEnabled && restrictedAreaParams?.letter) {
        const fontFamily = simulationParams.fontFamily || "Arial";
        const svgFontFamily = fontFamily.includes(" ") ? `"${fontFamily}"` : fontFamily;
        
        const svgCenterX = restrictedAreaParams.x + restrictedAreaParams.size / 2;
        const svgCenterY = restrictedAreaParams.y + restrictedAreaParams.size / 2;
        
        svgContent += `<text x="${svgCenterX}" y="${svgCenterY}" font-family=${svgFontFamily} font-size="${restrictedAreaParams.size * 0.8}" font-weight="bold" fill="${colors.letterColor}" text-anchor="middle" dominant-baseline="middle">${restrictedAreaParams.letter}</text>`;
      }

      svgContent += `</svg>`;

      // Download the SVG
      const svgBlob = new window.Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "blob-simulation.svg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading SVG:", error);
      alert("Failed to download SVG. See console for details.");
    }
  }, [isMounted, simulationParams, currentTheme, calculateRestrictedAreaParams]);

  /**
   * Handle clicks on the canvas for user interaction
   * Supports adding and removing blobs at click positions
   */
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { toolMode, containerMargin, minBlobSize, repelDistance, edgePointCount } = simulationParams;
      if (!toolMode) return;

      // Calculate click position with proper scaling
      const rect = canvas.getBoundingClientRect();
      const dpi = getDevicePixelRatio();
      const scaleX = canvas.width / dpi / rect.width;
      const scaleY = canvas.height / dpi / rect.height;
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;

      // Handle different tool modes
      switch (toolMode) {
        case 'add':
          // Check if click is inside container bounds
          if (x < containerMargin || x > CANVAS_SIZE - containerMargin || 
              y < containerMargin || y > CANVAS_SIZE - containerMargin) {
            console.warn("Cannot add shape: click is outside the container margin.");
            return;
          }

          // Add a new blob at the click position
          const newBlob = new Blob(x, y, edgePointCount, minBlobSize, repelDistance);
          blobsRef.current.push(newBlob);
          draw();
          break;
          
        case 'remove':
          // Remove blobs near click position
          let removedCount = 0;
          blobsRef.current = blobsRef.current.filter((blob) => {
            if (!blob?.centre || typeof blob.maxRadius === 'undefined') return true;
            
            const distSq = blob.centre.distanceToSquared(new Vector2(x, y));
            if (distSq <= blob.maxRadius * blob.maxRadius) {
              removedCount++;
              return false;
            }
            return true;
          });
          
          if (removedCount > 0) {
            console.log(`Removed ${removedCount} blob(s) near (${x.toFixed(1)}, ${y.toFixed(1)})`);
            draw();
          }
          break;
      }
    } catch (error) {
      console.error("Error handling canvas click:", error);
    }
  }, [simulationParams, draw]);

  // --- Loading Placeholder ---
  // If component is not mounted yet, render a placeholder to avoid hydration mismatch
  if (!isMounted) {
    return (
      <div className="flex flex-col lg:flex-row gap-6 items-start p-4 md:p-6 w-full">
        <div className="relative w-full max-w-[512px] aspect-square flex-shrink-0 mx-auto lg:mx-0">
          <div className="w-full h-full rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <p className="text-neutral-400">Loading simulation...</p>
          </div>
        </div>
        <div className="w-full max-w-[320px] h-[500px] bg-neutral-100 dark:bg-neutral-800 rounded-lg"></div>
      </div>
    );
  }
  
  // Get theme-appropriate colors for the simulation
  const colors = getSimulationColors(simulationParams, currentTheme);

  // --- JSX ---
  return (
    <SimulationParamsContext.Provider value={{ simulationParams, setSimulationParams }}>
      <div className="flex flex-col lg:flex-row gap-6 items-start p-4 md:p-6 w-full">
        {/* Canvas Container */}
        <div className="relative w-full max-w-[512px] aspect-square flex-shrink-0 mx-auto lg:mx-0">
          {/* Canvas Element */}
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className={`block rounded-lg w-full h-full border border-neutral-300 dark:border-neutral-700 ${simulationParams.toolMode ? 'cursor-crosshair' : 'cursor-default'}`}
            style={{ backgroundColor: colors.backgroundColor }}
          />
          
          {/* Live Editing Indicator */}
          {isLiveEditing && (
            <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded-md text-xs">
              Updating...
            </div>
          )}
          
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
          isAnimating={isAnimating}
        />
      </div>
    </SimulationParamsContext.Provider>
  );
}