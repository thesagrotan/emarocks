import { useContext, useMemo, useRef, useState, useEffect, useCallback } from "react"
import { SimulationParamsContext } from "./context"
import { Blob } from "./blob"
import * as SimulationUtils from "./utils"
import { SimulationParams, RestrictedAreaParams } from "./types"
import { Vector2 } from "three"
import { logError, logInfo, logWarn } from "@/shared"; // Import logger

/**
 * Hook to access the simulation parameters context.
 * Throws an error if used outside of a SimulationParamsContext.Provider.
 * @returns {object} The simulation parameters context value.
 * @throws {Error} If the hook is used outside of a SimulationParamsContext.Provider.
 */
export function useSimulationParams() {
  const ctx = useContext(SimulationParamsContext)
  if (!ctx) throw new Error("useSimulationParams must be used within SimulationParamsContext.Provider")
  return ctx
}

/**
 * Core function that calculates letter area information based on restricted area parameters.
 * This function performs canvas operations to determine the pixel area covered by the letter.
 * Used internally by `useLetterAreaCalculation` and `initializeBlobs`.
 *
 * @param {RestrictedAreaParams | undefined} restrictedAreaParams - Parameters defining the restricted area (letter, size, position, font).
 * @param {string} letterDisplayColor - The color used to draw the letter for area calculation.
 * @param {number} canvasSize - The size (width and height) of the canvas.
 * @returns {{
 *   letterArea: number,
 *   totalArea: number,
 *   letterAreaRatio: number,
 *   letterCenterX: number,
 *   letterCenterY: number,
 * }} An object containing calculated area information:
 *    - `letterArea`: The calculated pixel area covered by the letter.
 *    - `totalArea`: The total pixel area of the canvas.
 *    - `letterAreaRatio`: The ratio of the letter area to the total canvas area.
 *    - `letterCenterX`: The x-coordinate of the center of the letter area.
 *    - `letterCenterY`: The y-coordinate of the center of the letter area.
 * Returns default zero values if restricted area is not defined or canvas operations fail.
 */
function calculateLetterAreaCore(
  restrictedAreaParams: RestrictedAreaParams | undefined,
  letterDisplayColor: string,
  canvasSize: number
): {
  letterArea: number;
  totalArea: number;
  letterAreaRatio: number;
  letterCenterX: number;
  letterCenterY: number;
} {
  // Default values if we don't have a restricted area
  const result = {
    letterArea: 0,
    totalArea: canvasSize * canvasSize,
    letterAreaRatio: 0,
    letterCenterX: 0,
    letterCenterY: 0,
  };

  if (!restrictedAreaParams?.letter) return result;
  
  // Check if we're in a browser environment
  if (typeof document === 'undefined') {
    logInfo('Running on server, skipping canvas operations', undefined, 'calculateLetterAreaCore'); // Replaced console.log
    return result;
  }
  
  try {
    // Create temporary canvas for area calculation
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasSize;
    tempCanvas.height = canvasSize;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return result;
    
    // Calculate area covered by the letter
    const totalArea = canvasSize * canvasSize;
    const letterCenterX = restrictedAreaParams.x + restrictedAreaParams.size / 2;
    const letterCenterY = restrictedAreaParams.y + restrictedAreaParams.size / 2;
    
    // Draw letter temporarily to calculate its area
    tempCtx.fillStyle = letterDisplayColor;
    tempCtx.clearRect(0, 0, canvasSize, canvasSize);
    SimulationUtils.drawLetter(
      tempCtx, 
      restrictedAreaParams.letter, 
      letterCenterX, 
      letterCenterY, 
      restrictedAreaParams.size, 
      letterDisplayColor, 
      restrictedAreaParams.fontFamily
    );
    
    // Count letter pixels from temp canvas
    const imageData = tempCtx.getImageData(0, 0, canvasSize, canvasSize);
    const pixels = imageData.data;
    let letterPixels = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] > 0 || pixels[i + 1] > 0 || pixels[i + 2] > 0) {
        letterPixels++;
      }
    }
    
    const letterArea = (letterPixels / totalArea) * totalArea;
    const letterAreaRatio = letterArea / totalArea;
    
    // Clean up temporary canvas
    tempCanvas.width = 1;
    tempCanvas.height = 1;
    
    return {
      letterArea,
      totalArea,
      letterAreaRatio,
      letterCenterX,
      letterCenterY,
    };
  } catch (error) {
    logError("Error calculating letter area:", error, "calculateLetterAreaCore"); // Replaced console.error
    return result;
  }
}

/**
 * Utility hook for memoizing expensive letter area calculations.
 * Avoids recalculating letter area information on every render unless relevant parameters change.
 *
 * @param {RestrictedAreaParams | undefined} restrictedAreaParams - Parameters defining the restricted area (letter, size, position, font).
 * @param {string} letterDisplayColor - Current theme-appropriate letter color used for calculation.
 * @param {number} canvasSize - Size of the canvas.
 * @returns {object} Memoized letter area and position information, same structure as `calculateLetterAreaCore` return value.
 */
export function useLetterAreaCalculation(
  restrictedAreaParams: RestrictedAreaParams | undefined,
  letterDisplayColor: string,
  canvasSize: number
) {
  return useMemo(() => {
    return calculateLetterAreaCore(restrictedAreaParams, letterDisplayColor, canvasSize);
  }, [
    restrictedAreaParams?.letter,
    restrictedAreaParams?.x,
    restrictedAreaParams?.y,
    restrictedAreaParams?.size,
    restrictedAreaParams?.fontFamily,
    letterDisplayColor,
    canvasSize,
  ]);
}

/**
 * Creates a new array of initialized Blob objects based on simulation parameters and constraints.
 * Handles placement logic, including distributing blobs inside/outside a restricted letter area
 * and avoiding initial overlaps.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context, used for checking points within the letter.
 * @param {SimulationParams} params - Simulation parameters (shape count, sizes, margins, etc.).
 * @param {number} canvasSize - Canvas dimensions (width and height).
 * @param {RestrictedAreaParams | undefined} restrictedAreaParams - Parameters for the restricted area, if enabled.
 * @param {string} letterDisplayColor - Color used for checking points within the letter.
 * @returns {Blob[]} An array of initialized Blob objects.
 */
export function initializeBlobs(
  ctx: CanvasRenderingContext2D,
  params: SimulationParams,
  canvasSize: number,
  restrictedAreaParams: RestrictedAreaParams | undefined,
  letterDisplayColor: string
): Blob[] {
  const {
    shapeCount,
    edgePointCount,
    minBlobSize,
    repelDistance,
    containerMargin,
    fontFamily
  } = params;
  const blobs: Blob[] = [];
  // Use memoized letter area calculation - simulating the hook's behavior
  const {
    letterArea,
    totalArea,
    letterAreaRatio,
    letterCenterX,
    letterCenterY,
  } = calculateLetterArea(restrictedAreaParams, letterDisplayColor, canvasSize);
  // Calculate blob counts
  const outsideArea = totalArea - letterArea;
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
      const isValidPosition = restrictedAreaParams?.letter ? 
        !SimulationUtils.isPointInLetter(
          ctx, 
          restrictedAreaParams.letter, 
          letterCenterX, 
          letterCenterY, 
          restrictedAreaParams.size, 
          x, 
          y, 
          letterDisplayColor, 
          fontFamily
        ) : true;
      if (isValidPosition && !SimulationUtils.isOverlappingOtherBlobs(x, y, blobs, minBlobSize, repelDistance)) {
        blobs.push(new Blob(x, y, edgePointCount, minBlobSize, repelDistance));
        break;
      }
    } while (attempts < maxAttempts);
  }
  // Create points for blobs inside the letter
  if (restrictedAreaParams?.letter && insideShapeCount > 0) {
    for (let i = 0; i < insideShapeCount; i++) {
      let x, y;
      let attempts = 0;
      const maxAttempts = 50;
      do {
        x = containerMargin + Math.random() * (canvasSize - 2 * containerMargin);
        y = containerMargin + Math.random() * (canvasSize - 2 * containerMargin);
        attempts++;
        const isValidPosition = SimulationUtils.isPointInLetter(
          ctx, 
          restrictedAreaParams.letter, 
          letterCenterX, 
          letterCenterY, 
          restrictedAreaParams.size, 
          x, 
          y, 
          letterDisplayColor, 
          fontFamily
        );
        if (isValidPosition && !SimulationUtils.isOverlappingOtherBlobs(x, y, blobs, minBlobSize, repelDistance)) {
          blobs.push(new Blob(x, y, edgePointCount, minBlobSize, repelDistance));
          break;
        }
      } while (attempts < maxAttempts);
    }
  }
  // Remove any blobs that are in the restricted area after distribution
  if (restrictedAreaParams?.letter) {
    return blobs.filter(blob => {
      return !SimulationUtils.isPointInLetter(
        ctx,
        restrictedAreaParams.letter!,
        letterCenterX,
        letterCenterY,
        restrictedAreaParams.size,
        blob.centre.x,
        blob.centre.y,
        letterDisplayColor,
        fontFamily
      );
    });
  }
  return blobs;
}

/**
 * Non-hook version of the letter area calculation.
 * Used internally by `initializeBlobs` where hooks cannot be called.
 * Delegates the actual calculation to `calculateLetterAreaCore`.
 *
 * @param {RestrictedAreaParams | undefined} restrictedAreaParams - Parameters defining the restricted area.
 * @param {string} letterDisplayColor - Color used for calculation.
 * @param {number} canvasSize - Size of the canvas.
 * @returns {object} Calculated letter area information, same structure as `calculateLetterAreaCore` return value.
 */
function calculateLetterArea(
  restrictedAreaParams: RestrictedAreaParams | undefined,
  letterDisplayColor: string,
  canvasSize: number
) {
  return calculateLetterAreaCore(restrictedAreaParams, letterDisplayColor, canvasSize);
}

/**
 * Custom hook to manage the animation loop, state, and performance optimization for the blob simulation.
 *
 * Encapsulates:
 * - `requestAnimationFrame` loop management.
 * - Animation state (running/paused via `isAnimating`).
 * - Live parameter update indication (`isLiveEditing`).
 * - Frame timing and adaptive FPS control.
 * - Triggering physics updates and drawing.
 *
 * @param {SimulationParams} params - Current simulation parameters.
 * @param {React.RefObject<Blob[]>} blobsRef - Reference to the array of Blob objects.
 * @param {React.RefObject<HTMLCanvasElement>} canvasRef - Reference to the canvas element.
 * @param {() => void} draw - Function to draw the current simulation state onto the canvas.
 * @param {(width: number, height: number) => RestrictedAreaParams | undefined} calculateRestrictedAreaParams - Function to get current restricted area parameters.
 * @param {string} currentTheme - Current theme identifier ("light" or "dark").
 * @param {boolean} isMounted - Flag indicating if the component is mounted.
 * @returns {{
 *   isAnimating: boolean,
 *   setIsAnimating: React.Dispatch<React.SetStateAction<boolean>>,
 *   isLiveEditing: boolean,
 *   toggleAnimation: () => void,
 *   handleLiveParameterUpdate: (key: string, value: any) => void,
 *   animationFrameIdRef: React.MutableRefObject<number | null>
 * }} An object containing animation state and control functions:
 *    - `isAnimating`: Boolean indicating if the animation loop is active.
 *    - `setIsAnimating`: Function to directly set the animation state.
 *    - `isLiveEditing`: Boolean indicating if a parameter is being updated live.
 *    - `toggleAnimation`: Function to start or stop the animation loop.
 *    - `handleLiveParameterUpdate`: Function to call when parameters change during animation.
 *    - `animationFrameIdRef`: Ref holding the current animation frame ID.
 */
export function useBlobSimulationAnimation(
  params: SimulationParams,
  blobsRef: React.RefObject<Blob[]>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  draw: () => void,
  calculateRestrictedAreaParams: (width: number, height: number) => RestrictedAreaParams | undefined,
  currentTheme: string,
  isMounted: boolean
) {
  // --- Animation State ---
  /**
   * @type {boolean} isAnimating - Whether animation is currently running. Controls `requestAnimationFrame`.
   */
  const [isAnimating, setIsAnimating] = useState(false);

  /**
   * @type {boolean} isLiveEditing - Whether parameters are being updated live. Shows visual indicator.
   */
  const [isLiveEditing, setIsLiveEditing] = useState(false);

  /**
   * @type {React.MutableRefObject<number | null>} animationFrameIdRef - Ref to the current animation frame ID. Used for cancellation.
   */
  const animationFrameIdRef = useRef<number | null>(null);

  // --- Performance Optimization ---
  /**
   * @type {React.MutableRefObject<number>} lastFrameTimeRef - Timestamp of the last animation frame. For FPS control.
   */
  const lastFrameTimeRef = useRef<number>(0);

  /**
   * @type {React.MutableRefObject<number>} targetFPSRef - Target frames per second. Adapts based on performance.
   */
  const targetFPSRef = useRef<number>(60);

  /**
   * @type {React.MutableRefObject<number>} frameIntervalRef - Minimum time between frames (ms). Derived from targetFPS.
   */
  const frameIntervalRef = useRef<number>(1000 / 60);

  /**
   * Animation Lifecycle:
   *
   * 1. Initialization: Component mounts, state initialized (isAnimating=false).
   * 2. Animation Start: `toggleAnimation` called -> `isAnimating=true`, first frame requested.
   * 3. Animation Loop (`animate`):
   *    - Checks timing for FPS control.
   *    - Applies physics updates to blobs.
   *    - Calls `draw` function.
   *    - Requests next frame.
   * 4. Parameter Updates: User changes params -> `handleLiveParameterUpdate` called -> `isLiveEditing=true`, relevant blob props updated.
   * 5. Animation Pause: `toggleAnimation` called -> `isAnimating=false`, current frame canceled.
   * 6. Cleanup: Component unmounts -> Active frame canceled.
   */

  /**
   * Core animation loop function. Handles frame timing, physics updates, and drawing.
   * @type {() => void}
   */
  const animate = useCallback(() => {
    try {
      // --- Safety checks ---
      if (!canvasRef.current || !isMounted) { 
        setIsAnimating(false); 
        return; 
      }
            
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) { 
        setIsAnimating(false); 
        return; 
      }

      // --- Frame Timing ---
      // Calculate elapsed time since last frame
      const now = performance.now();
      const elapsed = now - lastFrameTimeRef.current;

      // Skip frame if it's too soon (for consistent frame rate)
      if (elapsed < frameIntervalRef.current) {
        animationFrameIdRef.current = requestAnimationFrame(animate);
        return;
      }

      // --- Adaptive Performance ---
      // Adjust frame interval based on actual frames per second
      const fps = 1000 / elapsed;
      if (fps < targetFPSRef.current - 5) {
        // If FPS is too low, increase frame interval (lower target FPS)
        frameIntervalRef.current = Math.min(frameIntervalRef.current * 1.1, 1000 / 30);
      } else if (fps > targetFPSRef.current + 5) {
        // If FPS is high enough, decrease frame interval (higher target FPS)
        frameIntervalRef.current = Math.max(frameIntervalRef.current * 0.9, 1000 / 60);
      }

      // Update last frame timestamp
      lastFrameTimeRef.current = now;

      // --- Extract parameters ---
      const { 
        springTension, containerMargin, isRoundedContainer,
        interactionStrength, maxExpansionFactor,
        gravity, damping, restrictedAreaEnabled,
        restrictedAreaShape, speed, repelDistance 
      } = params;
      
      // --- Canvas dimensions ---
      const canvasWidth = 512;
      const canvasHeight = 512;
      
      // --- Restricted area handling ---
      const restrictedAreaParams = calculateRestrictedAreaParams(canvasWidth, canvasHeight);
      const shapeType = restrictedAreaEnabled ? restrictedAreaShape : null;
      const shapeParams = restrictedAreaEnabled && restrictedAreaParams ? restrictedAreaParams : null;

      // --- Physics Update Step ---
      if (blobsRef.current) {
        // For speed > 1, perform multiple updates per frame
        const iterations = speed > 1 ? Math.min(Math.floor(speed), 3) : 1;
        const timeStep = elapsed / (1000 / 60); // Normalize timestep
        
        // Iterate through each physics step
        for (let i = 0; i < iterations; i++) {
          blobsRef.current.forEach((blob) => {
            if (blob?.update) {
              // Update each blob's repelDistance property with current value
              blob.repelDistance = repelDistance;
              
              // Apply physics update to blob
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
      }

      // --- Draw Step ---
      // Render the current state to the canvas
      draw();

      // Request next frame
      animationFrameIdRef.current = requestAnimationFrame(animate);
    } catch (error) {
      // Error handling - stop animation on error
      logError("Error during animation update:", error, "useBlobSimulationAnimation.animate"); // Replaced console.error
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      setIsAnimating(false);
    }
  }, [
    canvasRef, 
    isMounted, 
    params, 
    blobsRef, 
    draw, 
    calculateRestrictedAreaParams
  ]);

  /**
   * Helper function to get nearby blobs for interaction optimization.
   * Filters the full list of blobs to include only those within a calculated interaction range of the target blob.
   * @param {Blob} blob - The target blob.
   * @param {Blob[] | null} allBlobs - The complete list of blobs in the simulation.
   * @returns {Blob[]} An array of blobs considered "nearby" to the target blob.
   */
  const getNearbyBlobs = useCallback((blob: Blob, allBlobs: Blob[] | null): Blob[] => {
    if (!allBlobs) return [];
    
    // Calculate an interaction radius based on blob size
    const interactionRange = blob.maxRadius * 3 + blob.repelDistance;
    
    // Filter only blobs that are within interaction range
    return allBlobs.filter(otherBlob => {
      if (otherBlob === blob) return false; // Skip self
      
      // Fast distance check using squared distance
      const dx = otherBlob.centre.x - blob.centre.x;
      const dy = otherBlob.centre.y - blob.centre.y;
      const distSq = dx * dx + dy * dy;
      
      // Calculate maximum range (sum of both blob ranges)
      const maxRange = interactionRange + otherBlob.maxRadius;
       
      // Return true if within range
      return distSq <= maxRange * maxRange;
    });
  }, []);

  /**
   * Toggles the animation state between running and paused.
   * Manages starting and stopping the `requestAnimationFrame` loop.
   * @type {() => void}
   */
  const toggleAnimation = useCallback(() => {
    if (!isMounted) return;
    
    setIsAnimating(prev => {
      const nextIsAnimating = !prev;
      
      if (nextIsAnimating) {
        // Starting animation
        logInfo("Animation starting", undefined, "toggleAnimation"); // Replaced console.log
        
        // Cancel any existing animation frame first
        if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
        
        // Request the first animation frame to start the loop
        animationFrameIdRef.current = requestAnimationFrame(animate);
      } else {
        // Stopping animation
        logInfo("Animation stopping", undefined, "toggleAnimation"); // Replaced console.log
        
        // Cancel current animation frame
        if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      
      return nextIsAnimating;
    });
  }, [animate, isMounted]);

  /**
   * Handles live updates to simulation parameters while the animation is running.
   * Sets the `isLiveEditing` flag for visual feedback and applies immediate changes
   * to relevant blob properties (e.g., `repelDistance`). Clears letter cache if color changes.
   * @param {string} key - The parameter key being updated.
   * @param {any} value - The new value of the parameter.
   * @type {(key: string, value: any) => void}
   */
  const handleLiveParameterUpdate = useCallback((key: string, value: any) => {
    // Only process if animation is running
    if (!isAnimating) return;

    // Show the visual indicator
    setIsLiveEditing(true);
    
    // Clear the flag after a delay
    setTimeout(() => setIsLiveEditing(false), 800);
    
    // Immediate updates for certain parameters
    if (key === 'repelDistance' && blobsRef.current && blobsRef.current.length > 0) {
      // Update repelDistance on all blobs for immediate effect
      blobsRef.current.forEach(blob => {
        blob.repelDistance = value;
      });
    }

    // Clear letter shape cache when color changes
    if (key === 'letterColor' || key === 'darkLetterColor') {
      SimulationUtils.letterShapeCache.clear();
    }
  }, [isAnimating, blobsRef]);

  /**
   * Effect hook for cleaning up the animation frame when the component unmounts
   * or when dependencies change, preventing memory leaks.
   */
  useEffect(() => {
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, []);

  return {
    isAnimating,
    setIsAnimating, // Explicitly expose setIsAnimating
    isLiveEditing,
    toggleAnimation,
    handleLiveParameterUpdate,
    animationFrameIdRef // Expose ref for potential external control/monitoring
  };
}

/**
 * Hook to manage the invalidation of the letter shape cache (`SimulationUtils.letterShapeCache`).
 * It monitors relevant simulation parameters (letter, font family, color, size) and clears the cache
 * whenever any of these parameters change, ensuring that subsequent letter rendering uses fresh data.
 *
 * @param {Pick<SimulationParams, 'restrictedAreaLetter' | 'fontFamily' | 'letterColor' | 'darkLetterColor' | 'restrictedAreaSize'>} params - An object containing the specific simulation parameters that affect letter rendering.
 * @param {string} currentTheme - The current theme identifier ("light" or "dark"), used to select the correct letter color.
 * @returns {void} This hook does not return a value; its purpose is to trigger a side effect (cache clearing).
 */
export function useLetterCacheInvalidation(
  params: Pick<SimulationParams, 'restrictedAreaLetter' | 'fontFamily' | 'letterColor' | 'darkLetterColor' | 'restrictedAreaSize'>,
  currentTheme: string
): void {
  // Track parameters that should trigger cache invalidation
  const cacheKey = useMemo(() => ({
    letter: params.restrictedAreaLetter,
    fontFamily: params.fontFamily,
    letterColor: currentTheme === 'dark' ? params.darkLetterColor : params.letterColor,
    size: params.restrictedAreaSize
  }), [
    params.restrictedAreaLetter,
    params.fontFamily,
    params.letterColor,
    params.darkLetterColor,
    params.restrictedAreaSize,
    currentTheme
  ]);
  
  // Effect that invalidates the cache when relevant params change
  useEffect(() => {
    // Import clearLetterCache from font-utils to ensure we're using the centralized version
    import('@/shared/font-utils').then(({ clearLetterCache }) => {
      // Clear the letter shape cache when parameters change
      clearLetterCache(SimulationUtils.letterShapeCache);
      // Using console.debug here intentionally as it's less critical than info/warn/error
      console.debug('Letter shape cache cleared due to parameter change:', cacheKey);
    });
  }, [
    cacheKey.letter,
    cacheKey.fontFamily,
    cacheKey.letterColor,
    cacheKey.size
  ]);
}
