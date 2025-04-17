import React from "react";

/**
 * Defines the parameters controlling the blob simulation's behavior and appearance.
 */
export interface SimulationParams {
  // Physics/Blob Properties
  /** Number of blobs in the simulation */
  shapeCount: number;
  /** Number of points defining the edge of each blob */
  edgePointCount: number;
  /** Minimum size (radius) of a blob */
  minBlobSize: number;
  /** Distance at which blobs start repelling each other */
  repelDistance: number;
  /** Stiffness of the springs connecting blob edge points */
  springTension: number;
  /** Strength of the repulsion force between blobs */
  interactionStrength: number;
  /** Global gravitational force applied to particles (0 = no gravity) */
  gravity: number;
  /** Damping factor applied to particle velocity (0-1, lower = more damping) */
  damping: number;
  /** Maximum factor by which a blob can expand from its initial area (e.g., 1.2 = 120%) */
  maxExpansionFactor: number;
  /** Multiplier for simulation speed (e.g., 2 = double speed) */
  speed: number;

  // Container/Appearance
  /** Margin around the simulation container */
  containerMargin: number;
  /** Whether the container boundary is rounded (circle) or rectangular */
  isRoundedContainer: boolean;
  /** Whether to draw the container border */
  showBorder: boolean;
  /** Background color for the light theme */
  backgroundColor: string;
  /** Background color for the dark theme */
  darkBackgroundColor: string;
  /** Fill color for blobs in the light theme */
  blobFillColor: string;
  /** Opacity for blob fill in the light theme (0-1) */
  blobFillOpacity: number;
  /** Fill color for blobs in the dark theme */
  darkBlobFillColor: string;
  /** Opacity for blob fill in the dark theme (0-1) */
  darkBlobFillOpacity: number;
  /** Border color for blobs in the light theme */
  blobBorderColor: string;
  /** Border color for blobs in the dark theme */
  darkBlobBorderColor: string;
  /** Color of the letter/restricted area shape in the light theme */
  letterColor: string;
  /** Color of the letter/restricted area shape in the dark theme */
  darkLetterColor: string;
  /** Font family used for the letter */
  fontFamily?: string;

  // Theme Toggle Button Colors
  /** Background color for the theme toggle button in light theme */
  themeToggleBgColorLight: string;
  /** Background color for the theme toggle button in dark theme */
  themeToggleBgColorDark: string;
  /** Icon color for the theme toggle button in light theme */
  themeToggleIconColorLight: string;
  /** Icon color for the theme toggle button in dark theme */
  themeToggleIconColorDark: string;

  // Restricted Area / Static Obstacle
  /** Whether the restricted area (e.g., letter) is enabled */
  restrictedAreaEnabled: boolean;
  /** Shape of the restricted area (currently only 'letter' is fully supported) */
  restrictedAreaShape: 'letter' | null; // Refined type
  /** Size of the restricted area (e.g., font size for letter) */
  restrictedAreaSize: number;
  /** The letter character to display in the restricted area */
  restrictedAreaLetter: string;
  /** Margin around the restricted area shape */
  restrictedAreaMargin: number;
  /** Optional override for the X position of the restricted area (default: centered) */
  restrictedAreaX?: number;
  /** Optional override for the Y position of the restricted area (default: centered) */
  restrictedAreaY?: number;
}

/**
 * Defines the parameters for the restricted area (e.g., the letter shape).
 */
export interface RestrictedAreaParams {
  /** X-coordinate of the top-left corner (or center depending on context) */
  x: number;
  /** Y-coordinate of the top-left corner (or center depending on context) */
  y: number;
  /** Size of the area (e.g., font size) */
  size: number;
  /** Margin around the shape */
  margin: number;
  /** The letter character, if the shape is 'letter' */
  letter?: string;
  /** The font family used for the letter */
  fontFamily?: string;
}

/**
 * Defines the shape of the context object for SimulationParamsContext.
 */
export interface SimulationParamsContextType {
  /** The current simulation parameters */
  simulationParams: SimulationParams;
  /** Function to update the simulation parameters */
  setSimulationParams: React.Dispatch<React.SetStateAction<SimulationParams>>;
}

/** Defines the possible tool modes for canvas interaction */
export type ToolMode = 'add' | 'remove';

// Removed SimBlob and SimParticle interfaces as they are replaced by the Blob class type