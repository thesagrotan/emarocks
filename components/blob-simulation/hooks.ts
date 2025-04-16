import { useContext, useMemo, useRef, useState, useEffect, useCallback } from "react"
import { SimulationParamsContext } from "./context"
import { Blob } from "./blob"
import * as SimulationUtils from "./utils"
import { SimulationParams, RestrictedAreaParams } from "./types"
import { Vector2 } from "three"

export function useSimulationParams() {
  const ctx = useContext(SimulationParamsContext)
  if (!ctx) throw new Error("useSimulationParams must be used within SimulationParamsContext.Provider")
  return ctx
}

/**
 * Utility hook for memoizing expensive letter area calculations
 * 
 * @param restrictedAreaParams - Parameters defining the restricted area
 * @param letterDisplayColor - Current theme-appropriate letter color
 * @param canvasSize - Size of the canvas
 * @returns Memoized letter area and position information
 */
export function useLetterAreaCalculation(
  restrictedAreaParams: RestrictedAreaParams | undefined,
  letterDisplayColor: string,
  canvasSize: number
) {
  return useMemo(() => {
    // Default values if we don't have a restricted area
    const result = {
      letterArea: 0,
      totalArea: 0,
      letterAreaRatio: 0,
      letterCenterX: 0,
      letterCenterY: 0,
    };
    
    if (!restrictedAreaParams?.letter) return result;
    
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
      console.error("Error calculating letter area:", error);
      return result;
    }
  }, [
    restrictedAreaParams?.letter,
    restrictedAreaParams?.x,
    restrictedAreaParams?.y,
    restrictedAreaParams?.size,
    restrictedAreaParams?.fontFamily,
    letterDisplayColor,
    canvasSize
  ]);
}

/**
 * Creates a new array of blobs based on the provided parameters and constraints
 * 
 * @param ctx - Canvas 2D rendering context
 * @param params - Simulation parameters
 * @param canvasSize - Canvas dimensions
 * @param restrictedAreaParams - Parameters for the restricted area
 * @param letterDisplayColor - Color of the letter in the current theme
 * @returns Array of initialized Blob objects
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
 * Non-hook version of the letter area calculation for use in the utility function
 */
function calculateLetterArea(
  restrictedAreaParams: RestrictedAreaParams | undefined,
  letterDisplayColor: string,
  canvasSize: number
) {
  // Default values if we don't have a restricted area
  const result = {
    letterArea: 0,
    totalArea: canvasSize * canvasSize,
    letterAreaRatio: 0,
    letterCenterX: 0,
    letterCenterY: 0,
  };
  
  if (!restrictedAreaParams?.letter) return result;
  
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
    console.error("Error calculating letter area:", error);
    return result;
  }
}

/**
 * Custom hook to manage the animation frame and simulation state logic
 * 
 * This hook encapsulates all animation-related state and logic, including:
 * - Animation frame management
 * - FPS control and adaptive performance
 * - Animation state (running/paused)
 * - Blob physics updates
 * 
 * @param params - Current simulation parameters
 * @param blobsRef - Reference to the array of blobs
 * @param canvasRef - Reference to the canvas element
 * @param draw - Function to draw the current state
 * @param calculateRestrictedAreaParams - Function to calculate restricted area parameters
 * @param currentTheme - Current theme ("light" or "dark")
 * @returns Animation state and control functions
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
   * Whether animation is currently running
   * Controls whether animation frames are being requested
   */
  const [isAnimating, setIsAnimating] = useState(false);
  
  /**
   * Whether parameters are currently being updated in real-time
   * Used to show a visual indicator during live parameter updates
   */
  const [isLiveEditing, setIsLiveEditing] = useState(false);
  
  /**
   * Reference to the current animation frame ID
   * Used to cancel animation frames during cleanup or state changes
   */
  const animationFrameIdRef = useRef<number | null>(null);
  
  // --- Performance Optimization ---
  /**
   * Timestamp of the last animation frame
   * Used for frame timing and FPS control
   */
  const lastFrameTimeRef = useRef<number>(0);
  
  /**
   * Target frames per second
   * Adjusts dynamically based on performance
   */
  const targetFPSRef = useRef<number>(60);
  
  /**
   * Minimum time between frames in milliseconds
   * Derived from targetFPS, but can adapt based on performance
   */
  const frameIntervalRef = useRef<number>(1000 / 60);

  /**
   * Animation Lifecycle:
   * 
   * 1. Initialization: 
   *    - Component mounts
   *    - State initialized with isAnimating = false
   *    - Canvas and blobs are prepared
   * 
   * 2. Animation Start:
   *    - User clicks play or toggleAnimation is called
   *    - setIsAnimating(true) is called
   *    - First animation frame is requested
   *    - animate function begins executing
   * 
   * 3. Animation Loop:
   *    - Each frame checks timing to maintain consistent FPS
   *    - Physics updates are applied to all blobs
   *    - Canvas is redrawn with updated positions
   *    - Next animation frame is requested
   * 
   * 4. Parameter Updates:
   *    - User changes parameters during animation
   *    - handleLiveParameterUpdate is called
   *    - isLiveEditing is set to true temporarily
   *    - Relevant blob properties are updated immediately
   *    - Parameters continue to affect simulation in real-time
   * 
   * 5. Animation Pause:
   *    - User clicks pause or toggleAnimation is called again
   *    - setIsAnimating(false) is called
   *    - Current animation frame is canceled
   *    - No more frames are requested until play is clicked again
   * 
   * 6. Cleanup:
   *    - Component unmounts or dependencies change
   *    - Any active animation frame is canceled
   *    - Resources are released
   */

  /**
   * Core animation function - performs physics updates and rendering
   * 
   * This is the main animation loop that handles:
   * 1. Frame timing and FPS control
   * 2. Physics updates for all blobs
   * 3. Rendering via the provided draw function
   * 4. Requesting the next animation frame
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
      console.error("Error during animation update:", error);
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
   * Helper function to get only nearby blobs for interaction
   * This optimization prevents unnecessary calculations for blobs far apart
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
   * Toggle animation state between running and paused
   * 
   * State transitions:
   * - If currently paused -> start animation and request first frame
   * - If currently running -> cancel current frame and stop animation
   */
  const toggleAnimation = useCallback(() => {
    if (!isMounted) return;
    
    setIsAnimating(prev => {
      const nextIsAnimating = !prev;
      
      if (nextIsAnimating) {
        // Starting animation
        console.log("Animation starting");
        
        // Cancel any existing animation frame first
        if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
        
        // Request the first animation frame to start the loop
        animationFrameIdRef.current = requestAnimationFrame(animate);
      } else {
        // Stopping animation
        console.log("Animation stopping");
        
        // Cancel current animation frame
        if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      
      return nextIsAnimating;
    });
  }, [animate, isMounted]);

  /**
   * Handle live parameter updates
   * Sets a visual indicator and updates relevant blob properties immediately
   * 
   * This maintains a smooth visual transition when parameters change during animation
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
   * Cleanup animation when component unmounts or dependencies change
   * 
   * This ensures we don't leave any animation frames running when they're no longer needed,
   * preventing memory leaks and unnecessary CPU usage
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
    setIsAnimating, // Explicitly expose setIsAnimating for external use
    isLiveEditing,
    toggleAnimation,
    handleLiveParameterUpdate,
    // Also return the animationFrameIdRef for direct access if needed
    animationFrameIdRef
  };
}

/**
 * Hook to manage letter shape cache invalidation when font parameters change
 * 
 * This hook ensures the letter shape cache is cleared whenever any of the
 * parameters that affect letter rendering change, such as:
 * - The letter character itself
 * - Font family
 * - Letter color
 * - Letter size
 * 
 * @param {object} params - Current simulation parameters that impact letter rendering
 * @param {string} currentTheme - Current theme ('light' or 'dark')
 * @returns {void} 
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
      console.debug('Letter shape cache cleared due to parameter change:', cacheKey);
    });
  }, [
    cacheKey.letter, 
    cacheKey.fontFamily, 
    cacheKey.letterColor,
    cacheKey.size
  ]);
}
