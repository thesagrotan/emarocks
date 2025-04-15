"use client"

import { useEffect, useRef, useState } from "react"
import { Download, Pause, Play, Plus, Eraser, Move } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { Vector2 } from "three"
import { useLayoutEffect } from "react"

// Import refactored components and types
import { SimulationControls } from "./blob-simulation/simulation-controls"
import { Blob } from "./blob-simulation/blob"
import { hexToRgba, poissonDiskSampling, drawLetter, isPointInLetter, createLetterPath, findOptimalBlobPlacement, isOverlappingOtherBlobs, letterShapeCache, getLetterVisualBounds } from "./blob-simulation/utils"
import { SimulationParams, SimulationColors, RestrictedAreaParams } from "./blob-simulation/types"

// Safely access window properties with a function that only runs client-side
const getDevicePixelRatio = () => {
  if (typeof window !== 'undefined') {
    return window.devicePixelRatio || 1;
  }
  return 1;
};

const STORAGE_KEY = 'blob-simulation-settings';

// --- React Component ---
export function BlobSimulation() {
  // --- State ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isLiveEditing, setIsLiveEditing] = useState(false);
  const animationFrameIdRef = useRef<number | null>(null);
  const blobsRef = useRef<Blob[]>([]);
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";
  const lastFrameTimeRef = useRef<number>(0);
  const targetFPSRef = useRef<number>(60);
  const frameIntervalRef = useRef<number>(1000 / 60);

  // Load saved settings from localStorage on mount
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
      shapeCount: 250,
      edgePointCount: 20,
      minBlobSize: 4, // Reduced from 8 to 4
      repelDistance: 2, // Reduced from 10 to 2
      springTension: 0.35, // Slightly increased for better stability at small sizes
      interactionStrength: 0.06, // Slightly increased for better small blob interaction
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

      // Interaction/Tools
      toolMode: null,

      // Restricted Area / Static Obstacle
      restrictedAreaEnabled: true,
      restrictedAreaShape: 'letter',
      restrictedAreaSize: 400,
      restrictedAreaLetter: 'A',
      restrictedAreaMargin: 4, // Reduced margin to match new blob size
      // New: allow position override (default: centered)
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

  // --- Handle parameter updates ---
  const handleParamChange = (key: string, value: any) => {
    // Set live editing flag if the animation is running and the parameter can be updated on-the-fly
    const isStructuralParam = 
      key === 'shapeCount' || 
      key === 'edgePointCount' || 
      key === 'minBlobSize';
    
    if (isAnimating && !isStructuralParam) {
      setIsLiveEditing(true);
      // Clear the flag after a short delay
      setTimeout(() => setIsLiveEditing(false), 800);
      
      // Immediately update all blobs with the new parameter value if it's relevant
      if (key === 'repelDistance' && blobsRef.current.length > 0) {
        blobsRef.current.forEach(blob => {
          blob.repelDistance = value;
        });
      }

      // Clear letter shape cache when color changes
      if (key === 'letterColor' || key === 'darkLetterColor') {
        letterShapeCache.clear();
      }
    }
    
    setSimulationParams(prev => ({ ...prev, [key]: value }));
  };

  // Calculate restricted area params based on state
  const calculateRestrictedAreaParams = (canvasWidth: number, canvasHeight: number): RestrictedAreaParams | undefined => {
    const { restrictedAreaEnabled, restrictedAreaSize, restrictedAreaLetter, restrictedAreaMargin, restrictedAreaX, restrictedAreaY, fontFamily } = simulationParams;
    if (!restrictedAreaEnabled) return undefined;
    // Do NOT use baseline for restricted area box, only for letter drawing
    const x = restrictedAreaX !== undefined ? restrictedAreaX : (canvasWidth / 2 - restrictedAreaSize / 2);
    const y = restrictedAreaY !== undefined ? restrictedAreaY : (canvasHeight / 2 - restrictedAreaSize / 2);
    return {
      x,
      y,
      size: restrictedAreaSize,
      margin: restrictedAreaMargin,
      letter: restrictedAreaLetter,
      fontFamily // <-- Add fontFamily to params
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

  // Only restart for structural changes that require re-initialization
  useEffect(() => {
    if (!isInitialized || !isMounted) return;
    handleRestart();
  }, [
    simulationParams.shapeCount, 
    simulationParams.edgePointCount, 
    simulationParams.minBlobSize, 
    isInitialized, 
    isMounted
  ]);

  // Update visual appearance without restart
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
    simulationParams.letterColor,  // Added this
    simulationParams.darkLetterColor,  // Added this
    simulationParams.restrictedAreaEnabled, 
    simulationParams.restrictedAreaShape, 
    simulationParams.restrictedAreaSize, 
    simulationParams.restrictedAreaLetter,
    isInitialized,
    isMounted
  ]);

  // Redraw when restricted area position changes and not animating
  useEffect(() => {
    if (!isAnimating && isInitialized && isMounted && (simulationParams.restrictedAreaX !== undefined || simulationParams.restrictedAreaY !== undefined)) {
      draw();
    }
  }, [simulationParams.restrictedAreaX, simulationParams.restrictedAreaY, isAnimating, isInitialized, isMounted]);

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
        containerMargin,
        letterColor,
        darkLetterColor 
      } = simulationParams;
      
      // Use the theme-appropriate letter color for collision detection
      const letterDisplayColor = currentTheme === "dark" ? darkLetterColor : letterColor;
      
      const canvasSize = 512;
      const dpi = getDevicePixelRatio();
      
      // Set canvas dimensions
      canvas.width = canvasSize * dpi;
      canvas.height = canvasSize * dpi;
      canvas.style.width = `${canvasSize}px`;
      canvas.style.height = `${canvasSize}px`;
      ctx.setTransform(dpi, 0, 0, dpi, 0, 0);

      const logicalWidth = canvasSize - containerMargin;
      const logicalHeight = canvasSize - containerMargin;
      const minBlobDist = (minBlobSize * 2) + repelDistance;
      const pdsRestrictedArea = calculateRestrictedAreaParams(logicalWidth, logicalHeight);

      // Initialize blobs array
      blobsRef.current = [];

      // Calculate letter area and remaining area
      let letterArea = 0;
      let totalArea = logicalWidth * logicalHeight;
      let letterCenterX = 0, letterCenterY = 0;

      if (pdsRestrictedArea?.letter) {
        // Create temporary canvas for area calculation
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasSize;
        tempCanvas.height = canvasSize;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        // Draw letter temporarily to calculate its area using the current theme color and font
        tempCtx.fillStyle = letterDisplayColor;
        tempCtx.clearRect(0, 0, canvasSize, canvasSize);
        letterCenterX = pdsRestrictedArea.x + pdsRestrictedArea.size / 2;
        letterCenterY = pdsRestrictedArea.y + pdsRestrictedArea.size / 2;
        drawLetter(tempCtx, pdsRestrictedArea.letter, letterCenterX, letterCenterY, pdsRestrictedArea.size, letterDisplayColor, simulationParams.fontFamily);
        
        // Count letter pixels from temp canvas
        const imageData = tempCtx.getImageData(0, 0, canvasSize, canvasSize);
        const pixels = imageData.data;
        let letterPixels = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i] > 0 || pixels[i + 1] > 0 || pixels[i + 2] > 0) { // Check all color channels
            letterPixels++;
          }
        }
        letterArea = (letterPixels / (canvasSize * canvasSize)) * totalArea;

        // Clean up temporary canvas
        tempCanvas.width = 1;
        tempCanvas.height = 1;
      }

      const outsideArea = totalArea - letterArea;
      const letterAreaRatio = letterArea / totalArea;
      const insideShapeCount = Math.round(shapeCount * letterAreaRatio);
      const outsideShapeCount = shapeCount - insideShapeCount;

      // Create points for blobs outside the letter
      for (let i = 0; i < outsideShapeCount; i++) {
        let x, y;
        let attempts = 0;
        const maxAttempts = 50;

        do {
          x = containerMargin + Math.random() * (canvasSize - 2 * containerMargin);
          y = containerMargin + Math.random() * (canvasSize - 2 * containerMargin);
          attempts++;

          // Check if point is outside letter and not too close to other blobs
          const isValidPosition = pdsRestrictedArea?.letter ? 
            !isPointInLetter(ctx, pdsRestrictedArea.letter, letterCenterX, letterCenterY, pdsRestrictedArea.size, x, y, letterDisplayColor, simulationParams.fontFamily) :
            true;

          if (isValidPosition && !isOverlappingOtherBlobs(x, y, blobsRef.current, minBlobSize, repelDistance)) {
            blobsRef.current.push(new Blob(x, y, edgePointCount, minBlobSize, repelDistance));
            break;
          }
        } while (attempts < maxAttempts);
      }

      // Create points for blobs inside the letter
      if (pdsRestrictedArea?.letter && insideShapeCount > 0) {
        for (let i = 0; i < insideShapeCount; i++) {
          let x, y;
          let attempts = 0;
          const maxAttempts = 50;

          do {
            x = containerMargin + Math.random() * (canvasSize - 2 * containerMargin);
            y = containerMargin + Math.random() * (canvasSize - 2 * containerMargin);
            attempts++;

            const isValidPosition = isPointInLetter(ctx, pdsRestrictedArea.letter, letterCenterX, letterCenterY, pdsRestrictedArea.size, x, y, letterDisplayColor, simulationParams.fontFamily);

            if (isValidPosition && !isOverlappingOtherBlobs(x, y, blobsRef.current, minBlobSize, repelDistance)) {
              blobsRef.current.push(new Blob(x, y, edgePointCount, minBlobSize, repelDistance));
              break;
            }
          } while (attempts < maxAttempts);
        }
      }

      console.log("Initialization complete.");
      draw();
    } catch (error) {
      console.error("Error in initializeSimulation:", error);
    }
  };

  /**
   * Detect and relocate any blobs that overlap with the letter shape
   */
  const fixBlobsOverlappingWithLetter = (ctx: CanvasRenderingContext2D) => {
    const canvasWidth = 512;
    const canvasHeight = 512;
    const restrictedAreaParams = calculateRestrictedAreaParams(canvasWidth, canvasHeight);
    
    if (!restrictedAreaParams || !restrictedAreaParams.letter) return;
    
    const letterCenterX = restrictedAreaParams.x + restrictedAreaParams.size / 2;
    const letterCenterY = restrictedAreaParams.y + restrictedAreaParams.size / 2;
    const letterSize = restrictedAreaParams.size;
    const { containerMargin, letterColor, darkLetterColor } = simulationParams;

    const letterDisplayColor = currentTheme === "dark" ? darkLetterColor : letterColor;
    
    // First, check each blob to see if its center or any particles are inside the letter
    blobsRef.current.forEach((blob, blobIndex) => {
      // Quick check if blob center is inside letter
      const centerInLetter = isPointInLetter(
        ctx,
        restrictedAreaParams.letter!,
        letterCenterX,
        letterCenterY,
        letterSize,
        blob.centre.x,
        blob.centre.y,
        letterDisplayColor,
        restrictedAreaParams.fontFamily // <-- Pass fontFamily
      );
      
      // Check if any particles are inside letter (only if center isn't in letter)
      let anyParticleInLetter = false;
      if (!centerInLetter) {
        // Only check particles if center isn't already in letter
        for (const particle of blob.particles) {
          if (isPointInLetter(
            ctx,
            restrictedAreaParams.letter!,
            letterCenterX,
            letterCenterY,
            letterSize,
            particle.pos.x,
            particle.pos.y,
            letterDisplayColor,
            restrictedAreaParams.fontFamily // <-- Pass fontFamily
          )) {
            anyParticleInLetter = true;
            break;
          }
        }
      }
      
      // If blob needs relocation
      if (centerInLetter || anyParticleInLetter) {
        console.log(`Blob ${blobIndex} overlaps with letter - relocating`);
        
        // Strategy: Move the blob to a random position outside the restricted area
        let newX: number, newY: number;
        do {
          newX = containerMargin + Math.random() * (canvasWidth - 2 * containerMargin);
          newY = containerMargin + Math.random() * (canvasHeight - 2 * containerMargin);
        } while (isPointInLetter(ctx, restrictedAreaParams.letter!, letterCenterX, letterCenterY, letterSize, newX, newY, letterDisplayColor, restrictedAreaParams.fontFamily));  // Pass the color
        
        // Make sure the new position is within canvas bounds
        const safeX = Math.max(containerMargin + blob.maxRadius, 
                    Math.min(canvasWidth - containerMargin - blob.maxRadius, newX));
        const safeY = Math.max(containerMargin + blob.maxRadius, 
                    Math.min(canvasHeight - containerMargin - blob.maxRadius, newY));
        
        // Calculate offset from current to new position
        const offsetX = safeX - blob.centre.x;
        const offsetY = safeY - blob.centre.y;
        
        // Move all particles by this offset
        blob.particles.forEach(particle => {
          particle.pos.x += offsetX;
          particle.pos.y += offsetY;
        });
        
        // Update blob center
        blob.centre.x = safeX;
        blob.centre.y = safeY;
      }
    });
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
        letterColor, darkLetterColor,
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
        obstacle: currentTheme === "dark" ? darkLetterColor : letterColor,
        obstacleText: currentTheme === "dark" ? darkBackgroundColor : backgroundColor
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
      
      // Draw static obstacle/restricted area BEFORE blobs (important for visual clarity)
      const restrictedAreaParams = calculateRestrictedAreaParams(canvasWidth, canvasHeight);
      if (restrictedAreaEnabled && restrictedAreaParams) {
        if (restrictedAreaParams.letter) {
          // Use the theme-appropriate letter color
          const letterDisplayColor = currentTheme === "dark" ? darkLetterColor : letterColor;

          // Get baseline offset for perfect visual centering
          const font = `bold ${restrictedAreaParams.size}px ${simulationParams.fontFamily || "Arial"}`;
          const { baseline } = getLetterVisualBounds(restrictedAreaParams.letter, restrictedAreaParams.size, font);

          // Draw only the letter visually centered (no rectangle or background)
          const rectCenterX = restrictedAreaParams.x + restrictedAreaParams.size / 2;
          const rectCenterY = restrictedAreaParams.y + restrictedAreaParams.size / 2;
          const rectSize = restrictedAreaParams.size;
          drawLetter(
            ctx, 
            restrictedAreaParams.letter,
            rectCenterX,
            rectCenterY,
            rectSize, 
            letterDisplayColor,
            restrictedAreaParams.fontFamily // <-- Pass fontFamily
          );

          // Draw debug crosshair at center (optional, remove if not needed)
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

      // Draw blobs AFTER letter so they appear above it visually
      blobsRef.current.forEach((blob) => {
        if (blob?.draw) blob.draw(ctx, colors.fill, colors.border);
      });
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

      const now = performance.now();
      const elapsed = now - lastFrameTimeRef.current;

      // Skip frame if too soon
      if (elapsed < frameIntervalRef.current) {
        animationFrameIdRef.current = requestAnimationFrame(animate);
        return;
      }

      // Adjust frame interval based on performance
      const fps = 1000 / elapsed;
      if (fps < targetFPSRef.current - 5) {
        // If FPS is too low, increase frame interval
        frameIntervalRef.current = Math.min(frameIntervalRef.current * 1.1, 1000 / 30);
      } else if (fps > targetFPSRef.current + 5) {
        // If FPS is high enough, decrease frame interval
        frameIntervalRef.current = Math.max(frameIntervalRef.current * 0.9, 1000 / 60);
      }

      lastFrameTimeRef.current = now;

      const { 
        springTension, containerMargin, isRoundedContainer,
        interactionStrength, maxExpansionFactor,
        gravity, damping, restrictedAreaEnabled,
        restrictedAreaShape, speed, repelDistance
      } = simulationParams;
      
      const canvasWidth = 512;
      const canvasHeight = 512;
      const restrictedAreaParams = calculateRestrictedAreaParams(canvasWidth, canvasHeight);
      const shapeType = restrictedAreaEnabled ? restrictedAreaShape : null;
      const shapeParams = restrictedAreaEnabled && restrictedAreaParams ? restrictedAreaParams : null;

      // --- Update Step ---
      // For speed > 1, perform multiple updates per frame
      const iterations = speed > 1 ? Math.min(Math.floor(speed), 3) : 1;
      const timeStep = elapsed / (1000 / 60); // Normalize timestep

      for (let i = 0; i < iterations; i++) {
        blobsRef.current.forEach((blob) => {
          if (blob?.update) {
            // Update each blob's repelDistance property with current value
            blob.repelDistance = repelDistance;
            
            blob.update(
              // Only pass nearby blobs for interaction
              getNearbyBlobs(blob, blobsRef.current), 
              springTension * timeStep,
              canvasWidth, canvasHeight, containerMargin, isRoundedContainer,
              interactionStrength, maxExpansionFactor,
              gravity, damping,
              shapeType, shapeParams, ctx
            );
          }
        });
      }

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

  // Helper function to get only nearby blobs for interaction
  const getNearbyBlobs = (blob: Blob, allBlobs: Blob[]): Blob[] => {
    const interactionRange = blob.maxRadius * 3 + blob.repelDistance;
    return allBlobs.filter(otherBlob => {
      if (otherBlob === blob) return false;
      const dx = otherBlob.centre.x - blob.centre.x;
      const dy = otherBlob.centre.y - blob.centre.y;
      const distSq = dx * dx + dy * dy;
      const maxRange = interactionRange + otherBlob.maxRadius;
      return distSq <= maxRange * maxRange;
    });
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
        letterColor, darkLetterColor,
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
        obstacle: currentTheme === "dark" ? darkLetterColor : letterColor,
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

      if (restrictedAreaEnabled && restrictedAreaParams && restrictedAreaParams.letter) {
        // Use the same baseline logic as in calculateRestrictedAreaParams
        const fontFamily = simulationParams.fontFamily || "Arial";
        const svgFontFamily = fontFamily.includes(" ") ? `"${fontFamily}"` : fontFamily;
        const font = `bold ${restrictedAreaParams.size}px ${svgFontFamily}`;
        // No baseline offset for SVG overlays
        const svgCenterX = restrictedAreaParams.x + restrictedAreaParams.size / 2;
        const svgCenterY = restrictedAreaParams.y + restrictedAreaParams.size / 2;
        svgContent += `<text x="${svgCenterX}" y="${svgCenterY}" font-family=${svgFontFamily} font-size="${restrictedAreaParams.size * 0.8}" font-weight="bold" fill="${colors.obstacle}" text-anchor="middle" dominant-baseline="middle">${restrictedAreaParams.letter}</text>`;
      }

      svgContent += `</svg>`;

      // Use window.Blob to disambiguate from our Blob class
      const svgBlob = new window.Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
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
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { toolMode, containerMargin, minBlobSize, repelDistance, edgePointCount, letterColor, darkLetterColor } = simulationParams;
      if (!toolMode) return;

      const rect = canvas.getBoundingClientRect();
      const dpi = getDevicePixelRatio();
      const scaleX = canvas.width / dpi / rect.width;
      const scaleY = canvas.height / dpi / rect.height;
      const rawX = (event.clientX - rect.left) * scaleX;
      const rawY = (event.clientY - rect.top) * scaleY;

      if (toolMode === 'add') {
        // Check basic container bounds
        if (rawX < containerMargin || rawX > 512 - containerMargin || 
            rawY < containerMargin || rawY > 512 - containerMargin) {
          console.warn("Cannot add shape: click is outside the container margin.");
          return;
        }

        // Get optimal placement near the clicked position
        let x = rawX, y = rawY;
        const restrictedParams = calculateRestrictedAreaParams(512, 512);
        
        if (simulationParams.restrictedAreaEnabled && restrictedParams && restrictedParams.letter) {
          const letterCenterX = restrictedParams.x + restrictedParams.size / 2;
          const letterCenterY = restrictedParams.y + restrictedParams.size / 2;
          
          // Use optimal placement algorithm
          const letterDisplayColor = currentTheme === "dark" ? darkLetterColor : letterColor;
          const optimalPos = findOptimalBlobPlacement(
            ctx,
            blobsRef.current,
            restrictedParams.letter,
            letterCenterX,
            letterCenterY,
            restrictedParams.size,
            512,
            512,
            containerMargin,
            letterDisplayColor,
            restrictedParams.fontFamily // <-- Pass fontFamily
          );
          
          x = optimalPos.x;
          y = optimalPos.y;
        }

        // Check if new blob would overlap with existing blobs
        const isOverlapping = blobsRef.current.some(blob => {
          if (!blob || !blob.centre || typeof blob.maxRadius === 'undefined') return false;
          const distSq = new Vector2(x, y).distanceToSquared(blob.centre);
          const minAllowedDistSq = Math.pow(blob.maxRadius + minBlobSize + repelDistance, 2);
          return distSq < minAllowedDistSq;
        });

        if (isOverlapping) {
          console.warn("Cannot add shape: potential overlap with existing shapes.");
          return;
        }

        const newBlob = new Blob(x, y, edgePointCount, minBlobSize, repelDistance);
        blobsRef.current.push(newBlob);
        console.log(`Added new blob at ${x.toFixed(1)}, ${y.toFixed(1)}`);
      } else if (toolMode === 'remove') {
        // Remove blobs near click
        let removedCount = 0;
        blobsRef.current = blobsRef.current.filter((blob) => {
          if (!blob || !blob.centre || typeof blob.maxRadius === 'undefined') return true;
          const distSq = blob.centre.distanceToSquared(new Vector2(rawX, rawY));
          if (distSq <= blob.maxRadius * blob.maxRadius) {
            removedCount++;
            return false;
          }
          return true;
        });
        console.log(`Removed ${removedCount} blob(s) near ${rawX.toFixed(1)}, ${rawY.toFixed(1)}`);
      }

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
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setSimulationParams(prev => ({
                  ...prev,
                  restrictedAreaX: undefined,
                  restrictedAreaY: undefined
                }));
              }}
              className="bg-black/40 text-white hover:bg-black/60 border-none rounded-full"
              aria-label="Center Letter"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="12" r="4"/><line x1="10" y1="2" x2="10" y2="8"/><line x1="10" y1="16" x2="10" y2="18"/></svg>
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
  );
}