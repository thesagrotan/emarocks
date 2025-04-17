"use client"

import React, { RefObject } from "react"
import { getSimulationColors } from "@/shared/utils"
import * as SimulationUtils from "./utils"
import { Blob } from "./blob"
import { SimulationParams, RestrictedAreaParams } from "./types"
import { MAIN_CANVAS_SIZE } from "./constants"; // Import MAIN_CANVAS_SIZE

interface SimulationCanvasProps {
  /**
   * Reference to the canvas element
   */
  canvasRef: RefObject<HTMLCanvasElement>
  
  /**
   * Reference to the blobs array
   */
  blobsRef: RefObject<Blob[]>
  
  /**
   * Current theme (light or dark)
   */
  currentTheme: string
  
  /**
   * Simulation parameters
   */
  params: SimulationParams
  
  /**
   * Function to calculate restricted area parameters
   */
  calculateRestrictedAreaParams: (width: number, height: number) => RestrictedAreaParams | undefined
  
  /**
   * Canvas size in pixels
   */
  canvasSize: number
  
  /**
   * Whether a tool is currently active (affects cursor)
   */
  isUsingTool: boolean
  
  /**
   * Handler for canvas click events
   */
  onCanvasClick: (event: React.MouseEvent<HTMLCanvasElement>) => void
}

/**
 * SimulationCanvas component
 * 
 * Handles the canvas rendering for the blob simulation.
 * Extracts the canvas-specific JSX from the main component.
 */
export function SimulationCanvas({
  canvasRef,
  blobsRef,
  currentTheme,
  params,
  calculateRestrictedAreaParams,
  canvasSize,
  isUsingTool,
  onCanvasClick
}: SimulationCanvasProps) {
  // Get theme-appropriate colors for the simulation
  const colors = getSimulationColors(params, currentTheme);
  
  return (
    <canvas
      ref={canvasRef}
      onClick={onCanvasClick}
      className={`block rounded-lg w-full h-full border border-neutral-300 dark:border-neutral-700 ${isUsingTool ? 'cursor-crosshair' : 'cursor-default'}`}
      style={{ backgroundColor: colors.backgroundColor }}
      aria-label="Blob simulation canvas"
    />
  );
}

/**
 * Draw the current simulation state to the canvas
 * 
 * This function handles rendering of:
 * - Background
 * - Container boundary
 * - Letter shape (if enabled)
 * - Blobs (scaled appropriately for the canvas size)
 */
export function drawSimulation(
  canvasRef: RefObject<HTMLCanvasElement | null>, // Allow null ref
  blobsRef: RefObject<Blob[]>,
  params: SimulationParams,
  currentTheme: string,
  calculateRestrictedAreaParams: (width: number, height: number) => RestrictedAreaParams | undefined,
  canvasSize: number // The size of the target canvas (could be main or mini)
) {
  const canvas = canvasRef.current;
  if (!canvas) return;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { showBorder, containerMargin, isRoundedContainer, restrictedAreaEnabled, fontFamily } = params;
  
  // Get theme-appropriate colors
  const colors = getSimulationColors(params, currentTheme);

  // Get device pixel ratio for proper rendering on high-DPI screens
  const dpi = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const canvasWidth = canvasSize;
  const canvasHeight = canvasSize;
  
  // Calculate scale factor based on target canvas size vs main simulation size
  const scaleFactor = canvasSize / MAIN_CANVAS_SIZE; 

  // Reset transform and clear canvas
  ctx.setTransform(dpi, 0, 0, dpi, 0, 0);
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = colors.backgroundColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Draw container boundary
  const scaledContainerMargin = containerMargin * scaleFactor; // Scale the margin
  if (showBorder && scaledContainerMargin > 0) {
    ctx.strokeStyle = colors.borderColor;
    ctx.lineWidth = 1;
     if (isRoundedContainer) {
      const radius = (Math.min(canvasWidth, canvasHeight) - scaledContainerMargin * 2) / 2;
      const centerX = canvasWidth / 2;
      const centerY = canvasHeight / 2;
      if (radius > 0) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      ctx.strokeRect(scaledContainerMargin, scaledContainerMargin, canvasWidth - scaledContainerMargin * 2, canvasHeight - scaledContainerMargin * 2);
    }
  }
  
  // Draw static obstacle/restricted area BEFORE blobs (for visual clarity)
  const restrictedAreaParams = calculateRestrictedAreaParams(canvasWidth, canvasHeight);
  if (restrictedAreaEnabled && restrictedAreaParams) {
    if (restrictedAreaParams.letter) {
      // Get baseline offset for perfect visual centering
      const font = `bold ${restrictedAreaParams.size}px ${params.fontFamily || "Arial"}`;
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
  if (blobsRef.current) {
    blobsRef.current.forEach((blob) => {
      // Pass the calculated scaleFactor to the blob's draw method
      if (blob?.draw) blob.draw(ctx, colors.blobFill, colors.blobBorder, scaleFactor); 
    });
  }
}