import { useContext, useMemo } from "react"
import { SimulationParamsContext } from "./context"
import { Blob } from "./blob"
import * as SimulationUtils from "./utils"
import { SimulationParams, RestrictedAreaParams } from "./types"

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
