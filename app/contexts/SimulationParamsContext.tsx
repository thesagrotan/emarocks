import { createContext, useContext } from 'react';

export type SimulationParams = {
    blobCount: number;
    minBlobSize: number; // Target area in pixels^2
    maxExpansionFactor: number; // How much bigger than minBlobSize can area be
    edgePointCount: number; // How many points on the blob edge
    springTension: number;
    gravity: number;
    damping: number;
    interactionStrength: number; // Repulsion/attraction between blobs
    enableStaticShape: boolean;
    svgPathString: string; // Added: SVG path data string (e.g., "M10 10 H 90 V 90 H 10 Z")
    containerMargin: number;
    containerShape: 'rounded' | 'square';
    backgroundColorLight: string;
    backgroundColorDark: string;
    blobFillColorLight: string;
    blobFillColorDark: string;
    blobBorderColorLight: string;
    blobBorderColorDark: string;
    staticShapeBorderColorLight: string;
    staticShapeBorderColorDark: string;
};

export const defaultSimulationParams: SimulationParams = {
    blobCount: 15,
    minBlobSize: 1000,
    maxExpansionFactor: 1.5,
    edgePointCount: 12,
    springTension: 0.0005,
    gravity: 0.1,
    damping: 0.98,
    interactionStrength: 1,
    enableStaticShape: true,
    svgPathString: 'M150 50 L250 50 L250 150 L150 150 Z', // Added: Default square path
    containerMargin: 20,
    containerShape: 'rounded',
    backgroundColorLight: '#ffffff',
    backgroundColorDark: '#000000',
    blobFillColorLight: '#e2e8f0', // slate-200
    blobFillColorDark: '#334155', // slate-700
    blobBorderColorLight: '#94a3b8', // slate-400
    blobBorderColorDark: '#94a3b8', // slate-400
    staticShapeBorderColorLight: '#cbd5e1', // slate-300
    staticShapeBorderColorDark: '#475569', // slate-600
};