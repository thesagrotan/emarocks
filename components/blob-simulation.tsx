"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useTheme } from "next-themes"
import { Vector2 } from "three"

// Import refactored components and types
// Remove SimulationPhysicsPanel import if it's no longer used anywhere else
import { SimulationPhysicsPanel } from "./blob-simulation/simulation-physics-panel";
import { AppearanceLayoutControls } from "./blob-simulation/appearance-layout-controls"; // Renamed import
import { Blob as SimulationBlob } from "./blob-simulation/blob" // Renamed import
import { SimulationParamsContext } from "./blob-simulation/context"
import {
  useLetterAreaCalculation,
  initializeBlobs,
  useBlobSimulationAnimation,
  useLetterCacheInvalidation
} from "./blob-simulation/hooks"
import * as SimulationUtils from "./blob-simulation/utils"
import { SimulationParams, RestrictedAreaParams, ToolMode } from "./blob-simulation/types"
import { SimulationCanvas, drawSimulation } from "./blob-simulation/SimulationCanvas"
import { SimulationOverlays } from "./blob-simulation/SimulationOverlays"
import { logError, logWarn, logInfo } from "@/shared"; // Import logger
import { paramDescriptions } from "./blob-simulation/param-descriptions"; // Import descriptions
import { SimulationActionsProvider } from "@/contexts/SimulationActionsContext"; // Import the provider
import BottomMenuBar from "@/components/BottomMenuBar"; // Import BottomMenuBar

/**
 * Safely retrieves the device pixel ratio, returning 1 if `window` is not available (SSR).
 * @returns {number} The device pixel ratio or 1.
 */
const getDevicePixelRatio = () => {
  if (typeof window !== 'undefined') {
    return window.devicePixelRatio || 1;
  }
  return 1;
};

/** Key used for storing simulation settings in localStorage. @type {string} */
const STORAGE_KEY = 'blob-simulation-settings';
/** Constant size (width and height) for the simulation canvas. @type {number} */
const MAIN_CANVAS_SIZE = 512;
/** Constant size (width and height) for the mini simulation canvas. @type {number} */
// Removed MINI_CANVAS_SIZE constant

/**
 * The main component for the Blob Simulation application.
 *
 * Manages the overall simulation state, including:
 * - Simulation parameters (`simulationParams`) and their persistence.
 * - Canvas setup and rendering (`canvasRef`, `draw`).
 * - Blob objects (`blobsRef`) and their initialization/updates.
 * - Animation loop control (via `useBlobSimulationAnimation`).
 * - User interactions (parameter changes, canvas clicks, SVG download).
 * - Theme integration for colors.
 * - Restricted area definition and handling.
 *
 * It orchestrates interactions between the simulation logic, UI controls, and canvas rendering.
 */
export function BlobSimulation() {
  // --- Core Refs and State ---
  /**
   * Reference to the HTML canvas element used for rendering the simulation.
   * @type {React.RefObject<HTMLCanvasElement>}
   */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Removed miniCanvasRef

  /**
   * Reference to the array containing all active Blob objects in the simulation.
   * Using a ref allows direct mutation during the animation loop without triggering re-renders.
   * @type {React.RefObject<SimulationBlob[]>}
   */
  const blobsRef = useRef<SimulationBlob[]>([]);

  /**
   * State flag indicating whether the simulation has completed its initial setup.
   * Prevents certain effects from running before the canvas and blobs are ready.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * State flag indicating whether the component is currently mounted in the DOM.
   * Used for safe interaction with browser APIs (like `window`, `localStorage`) and cleanup.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [isMounted, setIsMounted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input

  // --- Tool Mode State ---
  /**
   * Separate state for the currently active tool mode ('add', 'remove', or null).
   * @type {[ToolMode | null, React.Dispatch<React.SetStateAction<ToolMode | null>>]}
   */
  const [toolMode, setToolMode] = useState<ToolMode | null>(null);

  // --- Mini Canvas State ---
  const [miniCanvasSize, setMiniCanvasSize] = useState(240); // State for mini canvas size
  const [redrawMiniCanvasTrigger, setRedrawMiniCanvasTrigger] = useState(0); // Trigger for mini canvas redraw

  // --- Theme ---
  /**
   * Theme information from `next-themes`. Includes the current theme ('light', 'dark')
   * and the resolved theme (guaranteed to be 'light' or 'dark').
   */
  const { theme, resolvedTheme } = useTheme();
  /** The currently active theme ('light' or 'dark'). @type {string} */
  const currentTheme = resolvedTheme || theme || "light";

  // --- Simulation Parameters ---
  /**
   * State object holding all configurable parameters for the simulation.
   * Loaded from localStorage on mount, defaults provided if no saved settings exist.
   * @type {[SimulationParams, React.Dispatch<React.SetStateAction<SimulationParams>>]}
   */
  const [simulationParams, setSimulationParams] = useState<SimulationParams>(() => {
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem(STORAGE_KEY);
      if (savedSettings) {
        try {
          return JSON.parse(savedSettings);
        } catch (e) {
          logError('Failed to parse saved settings:', e, 'BlobSimulation.useState'); // Replaced console.error
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

      // Restricted Area / Static Obstacle
      restrictedAreaEnabled: true,
      restrictedAreaShape: 'letter',
      restrictedAreaSize: 400,
      restrictedAreaLetter: 'A',
      restrictedAreaMargin: 4,
      // For position override (default: centered)
      restrictedAreaX: undefined,
      restrictedAreaY: undefined,
      // Font Family
      fontFamily: 'Inter', // Default font
    };
  });

  /**
   * Effect to save simulation parameters to localStorage whenever they change.
   * Runs only on the client-side.
   */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(simulationParams));
    }
  }, [simulationParams]);

  /**
   * Calculates the parameters for the restricted area (position, size, letter, font)
   * based on the current simulation parameters and canvas dimensions.
   * Centers the area by default if explicit coordinates are not provided.
   * @param {number} canvasWidth - The width of the canvas.
   * @param {number} canvasHeight - The height of the canvas.
   * @returns {RestrictedAreaParams | undefined} The calculated parameters, or undefined if the restricted area is disabled.
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
      fontFamily, // Pass fontFamily
    };
  }, [simulationParams]);

  /**
   * The main drawing function passed to the animation loop and other triggers.
   * Delegates the actual rendering logic to the `drawSimulation` utility function.
   * Handles potential errors during drawing and stops animation if an error occurs.
   * Triggers a redraw of the mini canvas.
   * @type {() => void}
   */
  const draw = useCallback(() => {
    try {
      // Draw the main simulation
      drawSimulation(
        canvasRef,
        blobsRef,
        simulationParams,
        currentTheme,
        calculateRestrictedAreaParams,
        MAIN_CANVAS_SIZE // Use main canvas size
      );

      // Trigger mini canvas redraw by incrementing the counter
      setRedrawMiniCanvasTrigger(prev => prev + 1);

    } catch (error) {
      logError("Error during draw cycle:", error, "BlobSimulation.draw"); // Replaced console.error
      setIsAnimating(false);
    }
  }, [simulationParams, currentTheme, calculateRestrictedAreaParams]); // Removed drawSimulation from dependencies as it's called internally

  /**
   * Effect to set the `isMounted` flag to true after the component mounts.
   * Includes a cleanup function to set it back to false on unmount.
   */
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);
  
  /**
   * Animation control state and functions obtained from the `useBlobSimulationAnimation` hook.
   * Includes `isAnimating`, `setIsAnimating`, `isLiveEditing`, `toggleAnimation`, `handleLiveParameterUpdate`.
   */
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
   * Callback function to handle changes to simulation parameters from the UI controls.
   * Updates the `simulationParams` state and calls `handleLiveParameterUpdate` if the
   * animation is running and the parameter change doesn't require a full restart.
   * @param {string} key - The key of the parameter that changed.
   * @param {any} value - The new value of the parameter.
   * @type {(key: string, value: any) => void}
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

  /** Handler for mini canvas size slider */
  const handleMiniCanvasSizeChange = useCallback((value: number) => {
    setMiniCanvasSize(value);
  }, []);

  /**
   * Initializes the simulation environment.
   * - Sets up the canvas dimensions and scaling based on device pixel ratio.
   * - Clears any existing animation frame.
   * - Clears the letter shape cache.
   * - Creates the initial set of Blob objects using `initializeBlobs`.
   * - Performs an initial draw.
   * @type {() => void}
   */
  const initializeSimulation = useCallback(() => {
    try {
      logInfo("Initializing simulation...", undefined, "initializeSimulation"); // Replaced console.log
      const canvas = canvasRef.current;
      // Removed miniCanvas logic
      if (!canvas) {
        logWarn("Main canvas ref is not available", undefined, "initializeSimulation"); // Replaced console.warn
        return;
      }
      
      const ctx = canvas.getContext("2d");
      if (!ctx) { // Check both contexts
        logWarn("Could not get 2D context from main canvas", undefined, "initializeSimulation"); // Replaced console.warn
        return;
      }

      // Stop any ongoing animation
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      
      const mainCanvasSize = MAIN_CANVAS_SIZE;
      const dpi = getDevicePixelRatio();
      
      // Set main canvas dimensions with proper DPI handling
      canvas.width = mainCanvasSize * dpi;
      canvas.height = mainCanvasSize * dpi;
      canvas.style.width = `${mainCanvasSize}px`;
      canvas.style.height = `${mainCanvasSize}px`;
      ctx.setTransform(dpi, 0, 0, dpi, 0, 0);

      // Removed mini canvas setup

      // Get theme-appropriate letter color
      const letterDisplayColor = currentTheme === "dark" 
        ? simulationParams.darkLetterColor 
        : simulationParams.letterColor;
      
      // Calculate restricted area parameters based on main canvas size
      const pdsRestrictedArea = calculateRestrictedAreaParams(mainCanvasSize, mainCanvasSize);
      
      // Clear any cached letter shape data before initialization
      SimulationUtils.letterShapeCache.clear();
      
      // Use the modularized blob initialization utility
      blobsRef.current = initializeBlobs(
        ctx,
        simulationParams,
        mainCanvasSize, // Use main canvas size for blob initialization
        pdsRestrictedArea,
        letterDisplayColor
      );

      logInfo("Initialization complete.", undefined, "initializeSimulation"); // Replaced console.log
      draw(); // This will also trigger the first mini canvas draw via the effect in AppearanceLayoutControls
    } catch (error) {
      logError("Error in initializeSimulation:", error, "initializeSimulation"); // Replaced console.error
    }
  }, [simulationParams, currentTheme, draw, calculateRestrictedAreaParams, animationFrameIdRef]);

  /**
   * Handles the restart of the simulation.
   * Clears the current blobs, redraws an empty canvas, and then re-initializes the simulation.
   * Also clears the mini canvas.
   * Uses `requestAnimationFrame` and `setTimeout` to ensure proper visual clearing before re-initialization.
   * @type {() => void}
   */
  const handleRestart = useCallback(() => {
    if (!isMounted) return;
    
    logInfo("Restarting simulation...", undefined, "handleRestart"); // Replaced console.log
    // Clear blobs visually
    blobsRef.current = [];
    // Use requestAnimationFrame for the redraw to avoid race conditions
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        // Clear main canvas via draw function
        draw(); 
        // Re-initialize after the draw confirms canvas is clear
        setTimeout(() => {
          initializeSimulation();
        }, 50);
      });
    }
  }, [isMounted, draw, initializeSimulation]);

  // --- Settings Download/Load Handlers ---

  /**
   * Triggers the download of the current simulation settings as a JSON file.
   */
  const handleDownloadSettings = useCallback(() => {
    if (!isMounted) return;
    try {
      const settingsString = JSON.stringify(simulationParams, null, 2);
      // Use the standard Blob constructor (no window. prefix needed now)
      const blob = new Blob([settingsString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "blob-settings.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      logInfo("Settings downloaded.", undefined, "handleDownloadSettings");
    } catch (error) {
      logError("Error downloading settings:", error, "handleDownloadSettings");
    }
  }, [simulationParams, isMounted]);

  /**
   * Handles the file selection event for loading settings.
   * Reads the file, parses JSON, updates state, and restarts the simulation.
   */
  const handleLoadSettings = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isMounted || !event.target.files || event.target.files.length === 0) {
      return;
    }
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        if (typeof content !== 'string') {
          throw new Error("Failed to read file content.");
        }
        const loadedParams = JSON.parse(content);

        // Basic validation (can be expanded)
        if (typeof loadedParams !== 'object' || loadedParams === null || typeof loadedParams.shapeCount === 'undefined') {
           throw new Error("Invalid settings file format.");
        }

        // Merge loaded settings with existing defaults to handle missing keys
        setSimulationParams(prev => ({ ...prev, ...loadedParams }));
        logInfo("Settings loaded successfully. Restarting simulation...", loadedParams, "handleLoadSettings");
        
        // Restart simulation after state update
        // Use setTimeout to ensure state update completes before restart
        setTimeout(handleRestart, 0);

      } catch (error) {
        logError("Error loading settings:", error, "handleLoadSettings");
        alert(`Failed to load settings: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        // Reset file input value to allow loading the same file again
        if (event.target) {
          event.target.value = '';
        }
      }
    };

    reader.onerror = (e) => {
      logError("Error reading file:", e, "handleLoadSettings");
      alert("Failed to read the selected file.");
       // Reset file input value
       if (event.target) {
         event.target.value = '';
       }
    };

    reader.readAsText(file);
  }, [isMounted, handleRestart]); // Added handleRestart dependency

  /**
   * Programmatically clicks the hidden file input element.
   */
  const triggerFileInput = useCallback(() => {
    // Use the correct ID from simulation-physics-panel.tsx
    const inputElement = document.getElementById('load-settings-input-physics');
    if (inputElement) {
      inputElement.click();
    } else {
      logWarn("Could not find file input element with id 'load-settings-input-physics'", undefined, "triggerFileInput");
    }
  }, []);

  // --- Lifecycle Effects ---

  /**
   * Effect to perform the initial simulation setup after the component mounts.
   * Uses a `setTimeout` to ensure the canvas element is fully ready in the DOM.
   * Sets the `isInitialized` flag upon completion.
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
   * Effect to automatically restart the simulation when structural parameters
   * (`shapeCount`, `edgePointCount`, `minBlobSize`) change after initialization.
   */
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

  /**
   * Effect to redraw the simulation when visual parameters (colors, borders, container shape,
   * restricted area settings) change, but only if the simulation is initialized and mounted.
   * This avoids a full restart for purely visual updates.
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
   * Effect to redraw the simulation when the restricted area's explicit position
   * (`restrictedAreaX`, `restrictedAreaY`) changes, but only if the animation is *not* running.
   * Allows manual positioning updates to be reflected immediately without starting animation.
   */
  useEffect(() => {
    if (!isAnimating && isInitialized && isMounted && (simulationParams.restrictedAreaX !== undefined || simulationParams.restrictedAreaY !== undefined)) {
      draw();
    }
  }, [simulationParams.restrictedAreaX, simulationParams.restrictedAreaY, isAnimating, isInitialized, isMounted, draw]);

  /**
   * Effect to handle keyboard arrow key events for moving the restricted area.
   * Updates `restrictedAreaX` and `restrictedAreaY` in the simulation parameters.
   * Shift key increases movement step.
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
          : (MAIN_CANVAS_SIZE / 2 - prev.restrictedAreaSize / 2);
        
        const initialY = typeof prev.restrictedAreaY === 'number' 
          ? prev.restrictedAreaY 
          : (MAIN_CANVAS_SIZE / 2 - prev.restrictedAreaSize / 2);
        
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
   * Generates and triggers the download of an SVG file representing the current simulation state.
   * Constructs the SVG content including background, boundaries, blobs (as paths), and the letter shape (as text).
   * @type {() => void}
   */
  const downloadSVG = useCallback(() => {
    if (!isMounted) return;
    
    try {
      logInfo("Generating SVG...", undefined, "downloadSVG"); // Replaced console.log
      const { 
        showBorder, containerMargin, isRoundedContainer,
        restrictedAreaEnabled
      } = simulationParams;
      
      const canvasWidth = MAIN_CANVAS_SIZE;
      const canvasHeight = MAIN_CANVAS_SIZE;
      
      // Import getSimulationColors from shared utils only when needed
      const { getSimulationColors } = require("@/shared/utils");
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
      logError("Error downloading SVG:", error, "downloadSVG"); // Replaced console.error
      // Consider using a more user-friendly notification instead of alert
      // alert("Failed to download SVG. See console for details.");
      logWarn("Failed to download SVG. See console for details.", undefined, "downloadSVG");
    }
  }, [isMounted, simulationParams, currentTheme, calculateRestrictedAreaParams]);

  /**
   * Handles mouse click events on the simulation canvas.
   * Based on the current `toolMode` ('add' or 'remove'), it either adds a new blob
   * at the click location or removes blobs whose area contains the click location.
   * Calculates click coordinates relative to the canvas, accounting for DPI scaling.
   * @param {React.MouseEvent<HTMLCanvasElement>} event - The mouse click event.
   * @type {(event: React.MouseEvent<HTMLCanvasElement>) => void}
   */
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Read toolMode from the separate state
      if (!toolMode) return; 
      
      const { containerMargin, minBlobSize, repelDistance, edgePointCount } = simulationParams;

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
          if (x < containerMargin || x > MAIN_CANVAS_SIZE - containerMargin || 
              y < containerMargin || y > MAIN_CANVAS_SIZE - containerMargin) {
            logWarn("Cannot add shape: click is outside the container margin.", { x, y }, "handleCanvasClick"); // Replaced console.warn
            return;
          }

          // Add a new blob at the click position using the renamed class
          const newBlob = new SimulationBlob(x, y, edgePointCount, minBlobSize, repelDistance);
          blobsRef.current.push(newBlob);
          draw();
          break;
          
        case 'remove':
          // Remove blobs near click position
          let removedCount = 0;
          blobsRef.current = blobsRef.current.filter((blob) => {
            // Check if blob is an instance of SimulationBlob if necessary
            if (!blob?.centre || typeof blob.maxRadius === 'undefined') return true;
            
            const distSq = blob.centre.distanceToSquared(new Vector2(x, y));
            if (distSq <= blob.maxRadius * blob.maxRadius) {
              removedCount++;
              return false;
            }
            return true;
          });
          
          if (removedCount > 0) {
            logInfo(`Removed ${removedCount} blob(s) near (${x.toFixed(1)}, ${y.toFixed(1)})`, undefined, "handleCanvasClick"); // Replaced console.log
            draw();
          }
          break;
      }
    } catch (error) {
      logError("Error handling canvas click:", error, "handleCanvasClick"); // Replaced console.error
    }
  // Update dependency array to include the separate toolMode state
  }, [simulationParams, draw, toolMode]); 

  /**
   * Handles changes to the active tool mode using the separate state.
   * @param {'add' | 'remove' | null} mode - The tool mode to activate or null to deactivate.
   * @type {(mode: 'add' | 'remove' | null) => void}
   */
  const handleSetToolModeAction = useCallback((mode: ToolMode | null) => {
    // Add explicit type for prev
    setToolMode((prev: ToolMode | null) => prev === mode ? null : mode);
  }, []);

  /** Memoized calculation of restricted area parameters. @type {RestrictedAreaParams | undefined} */
  const restrictedAreaParams = calculateRestrictedAreaParams(MAIN_CANVAS_SIZE, MAIN_CANVAS_SIZE);
  /** Current theme-appropriate color for the letter. @type {string} */
  const letterDisplayColor = currentTheme === "dark" 
    ? simulationParams.darkLetterColor 
    : simulationParams.letterColor;
  
  /** Memoized calculation of letter area statistics using `useLetterAreaCalculation`. @type {object} */
  const letterAreaStats = useLetterAreaCalculation(
    restrictedAreaParams,
    letterDisplayColor,
    MAIN_CANVAS_SIZE // Use main canvas size for stats
  );
  
  /** Hook call to manage letter shape cache invalidation based on relevant parameter changes. */
  useLetterCacheInvalidation(
    {
      restrictedAreaLetter: simulationParams.restrictedAreaLetter,
      fontFamily: simulationParams.fontFamily,
      letterColor: simulationParams.letterColor,
      darkLetterColor: simulationParams.darkLetterColor,
      restrictedAreaSize: simulationParams.restrictedAreaSize
    },
    currentTheme
  );

  // --- Loading Placeholder ---
  // Render placeholder if component is not yet mounted to prevent hydration errors.
  if (!isMounted) {
    return (
      // Restore original placeholder with two sidebars
      <div className="relative w-full min-h-screen p-4 md:p-6">
        {/* Fixed Placeholders */}
        <div className={`fixed top-0 left-0 bottom-0 w-[320px] h-screen bg-neutral-100 dark:bg-neutral-800 rounded-lg m-4 md:m-6 z-10`}></div>
        <div className={`fixed top-0 right-0 bottom-0 w-[320px] h-screen bg-neutral-100 dark:bg-neutral-800 rounded-lg m-4 md:m-6 z-10`}></div>

        {/* Centered Canvas Placeholder - Restore original padding */}
        <div className="flex justify-center items-center min-h-screen" style={{ paddingLeft: `344px`, paddingRight: `344px` }}>
          <div className="relative w-full max-w-[512px] aspect-square flex-shrink-0">
            <div className="w-full h-full rounded-lg bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
              <p className="text-neutral-400">Loading simulation...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Prepare actions for the context provider ---
  const simulationActions = {
    // isPlaying is handled internally by the context provider
    // handlePlayPause is handled internally by the context provider (it calls toggleAnimation)
    handleRestart,
    handleLoadSettings: triggerFileInput, // Map triggerFileInput to handleLoadSettings
    handleDownloadSettings,
    handleDownloadSvg: downloadSVG,
    handleAddBlob: () => handleSetToolModeAction('add'), // Map to tool mode setter
    handleRemoveBlob: () => handleSetToolModeAction('remove'), // Map to tool mode setter
    // We also need to provide the actual play/pause toggle function
    // Let's modify the context provider slightly to accept this
    togglePlayPause: toggleAnimation, 
  };

  // --- Render ---
  return (
    // Wrap the entire component content with the Provider
    <SimulationActionsProvider actions={simulationActions}>
      <SimulationParamsContext.Provider value={{ simulationParams, setSimulationParams }}>
        {/* Main container - relative positioning context */}
        <div className="relative w-full min-h-screen">

          {/* Left Fixed Sidebar (Restored) */}
          <div className={`fixed top-0 left-0 bottom-0 w-[320px] h-screen overflow-y-auto p-4 md:p-6 z-10`}>
            <SimulationPhysicsPanel
              params={simulationParams}
              onParamChange={handleParamChange}
              onRestart={handleRestart}
              onDownloadSVG={downloadSVG}
              onDownloadSettings={handleDownloadSettings}
              onLoadSettings={handleLoadSettings}
              triggerFileInput={triggerFileInput} // Pass trigger function
              isAnimating={isAnimating}
              paramDescriptions={paramDescriptions}
              canvasSize={MAIN_CANVAS_SIZE}
              // Pass fileInputRef down if preferred
              // fileInputRef={fileInputRef}
            />
          </div>

          {/* Center Content Area (Main Canvas) - Restore padding */}
          <div
            className="flex justify-center items-center min-h-screen"
            style={{
              paddingLeft: `344px`, // Restore left padding
              paddingRight: `344px`
            }}
          >
            {/* Main Canvas Container */}
            <div className="relative w-full max-w-[512px] aspect-square flex-shrink-0">
              {/* Main Canvas Component */}
              <SimulationCanvas
                canvasRef={canvasRef}
                blobsRef={blobsRef}
                currentTheme={currentTheme}
                params={simulationParams}
                calculateRestrictedAreaParams={calculateRestrictedAreaParams}
                canvasSize={MAIN_CANVAS_SIZE}
                isUsingTool={!!toolMode}
                onCanvasClick={handleCanvasClick}
              />

              {/* Overlays Component */}
              <SimulationOverlays
                isAnimating={isAnimating}
                isLiveEditing={isLiveEditing}
                toolMode={toolMode}
                onToggleAnimation={toggleAnimation}
                onSetToolMode={handleSetToolModeAction}
                onDownloadSVG={downloadSVG}
              />
            </div>
          </div>

          {/* Right Fixed Sidebar (Now contains all controls) */}
          <div className={`fixed top-0 right-0 bottom-0 w-[320px] h-screen overflow-y-auto p-4 md:p-6 z-10`}>
            <AppearanceLayoutControls
              params={simulationParams}
              onParamChange={handleParamChange}
              paramDescriptions={paramDescriptions}
              currentTheme={currentTheme}
              isAnimating={isAnimating}
              // Mini Canvas Props
              mainCanvasRef={canvasRef}
              blobsRef={blobsRef} // Pass blobsRef down
              miniCanvasSize={miniCanvasSize}
              onMiniCanvasSizeChange={handleMiniCanvasSizeChange}
              redrawMiniCanvasTrigger={redrawMiniCanvasTrigger}
              // Removed physics/action props
            />
          </div>

          {/* Render BottomMenuBar here, inside the provider */}
          <BottomMenuBar />

        </div>
      </SimulationParamsContext.Provider>
    </SimulationActionsProvider>
  );
}