// Types for the blob simulation

/**
 * All simulation parameters interface
 */
export interface SimulationParams {
  // Simulation Parameters
  shapeCount: number;
  edgePointCount: number;
  minBlobSize: number;
  repelDistance: number;
  springTension: number;
  interactionStrength: number;
  gravity: number;
  damping: number;
  maxExpansionFactor: number;
  speed: number; 

  // Container/Appearance
  containerMargin: number;
  isRoundedContainer: boolean;
  showBorder: boolean;
  backgroundColor: string;
  darkBackgroundColor: string;
  blobFillColor: string;
  blobFillOpacity: number;
  darkBlobFillColor: string;
  darkBlobFillOpacity: number;
  blobBorderColor: string;
  darkBlobBorderColor: string;
  letterColor: string;
  darkLetterColor: string;

  // Interaction/Tools
  toolMode: 'add' | 'remove' | 'drag-letter' | null;

  // Restricted Area / Static Obstacle
  restrictedAreaEnabled: boolean;
  restrictedAreaShape: 'letter';
  restrictedAreaSize: number;
  restrictedAreaLetter: string;
  restrictedAreaMargin: number;
  // Add these for drag support
  restrictedAreaX?: number;
  restrictedAreaY?: number;
  // Font for the letter
  fontFamily?: string;
}

/**
 * Restricted area parameters for collision detection
 */
export interface RestrictedAreaParams {
  x: number;
  y: number;
  size: number;
  margin: number;
  letter?: string;
  fontFamily?: string;
}

/**
 * Defines color theme options for the simulation
 */
export interface SimulationColors {
  bg: string;
  fg: string;
  accent: string;
  fill: string;
  border: string;
  obstacle: string;
  obstacleText: string;
}