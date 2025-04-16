"use client"

import React from 'react';
import { Play, Pause, Plus, Minus, Download } from 'lucide-react';
// Guessing the path might be for a standard Button component if IconButton is not found
// You might need to adapt usage if this is not a direct replacement for IconButton
import { Button } from '@/components/ui/button'; 
import { ToolMode } from './types'

interface SimulationOverlaysProps {
  isAnimating: boolean;
  isLiveEditing: boolean;
  toolMode: ToolMode | null;
  onToggleAnimation: () => void;
  onSetToolMode: (mode: ToolMode | null) => void;
  onDownloadSVG: () => void;
}

export function SimulationOverlays({
  isAnimating,
  isLiveEditing,
  toolMode,
  onToggleAnimation,
  onSetToolMode,
  onDownloadSVG
}: SimulationOverlaysProps) {
  // NOTE: Using Button might require changes here if IconButton had specific props/styling
  // Example: You might need to add size="icon" variant="ghost" etc. to the Button components below
  return (
    <div className="absolute inset-0 flex flex-col justify-between p-3 pointer-events-none">
      {/* Top-right controls */}
      <div className="flex justify-end gap-2 pointer-events-auto">
        {/* Add Shape Button - Adapt as needed */}
        <Button
          variant={toolMode === 'add' ? "secondary" : "ghost"} // Example adaptation
          size="icon" // Example adaptation
          aria-label="Add Shape"
          onClick={() => onSetToolMode('add')}
        >
          <Plus className="h-4 w-4" />
        </Button>
        {/* Remove Shape Button - Adapt as needed */}
        <Button
          variant={toolMode === 'remove' ? "secondary" : "ghost"} // Example adaptation
          size="icon" // Example adaptation
          aria-label="Remove Shape"
          onClick={() => onSetToolMode('remove')}
        >
          <Minus className="h-4 w-4" />
        </Button>
        {/* Download SVG Button - Adapt as needed */}
        <Button
          variant="ghost" // Example adaptation
          size="icon" // Example adaptation
          aria-label="Download SVG"
          onClick={onDownloadSVG}
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Bottom-left controls */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Play/Pause Button - Adapt as needed */}
        <Button
          size="icon" // Example adaptation
          aria-label={isAnimating ? 'Pause' : 'Play'}
          onClick={onToggleAnimation}
          // className="bg-primary text-primary-foreground hover:bg-primary/90" // Standard Button might not need this
        >
          {isAnimating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        {/* Live Editing Indicator */}
        {isLiveEditing && (
          <span className="text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
            Applying changes...
          </span>
        )}
      </div>
    </div>
  );
}