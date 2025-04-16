"use client"

import React from "react"
import { Download, Pause, Play, Plus, Eraser } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SimulationOverlayProps {
  /**
   * Whether the simulation is currently animating
   */
  isAnimating: boolean
  
  /**
   * Whether parameters are currently being updated live
   */
  isLiveEditing: boolean
  
  /**
   * Current active tool mode (add, remove, or null)
   */
  toolMode: 'add' | 'remove' | null
  
  /**
   * Handler for toggling animation state
   */
  onToggleAnimation: () => void
  
  /**
   * Handler for setting tool mode
   */
  onSetToolMode: (mode: 'add' | 'remove' | null) => void
  
  /**
   * Handler for downloading SVG
   */
  onDownloadSVG: () => void
}

/**
 * SimulationOverlays component
 * 
 * Container for all overlay elements displayed on top of the simulation canvas.
 * This includes:
 * - Live editing indicator
 * - Play/pause button
 * - Tool buttons
 * - Download button
 */
export function SimulationOverlays({
  isAnimating,
  isLiveEditing,
  toolMode,
  onToggleAnimation,
  onSetToolMode,
  onDownloadSVG
}: SimulationOverlayProps) {
  return (
    <>
      {/* Live Editing Indicator */}
      {isLiveEditing && (
        <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded-md text-xs">
          Updating...
        </div>
      )}
      
      {/* Main Overlay Controls */}
      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center pointer-events-none">
        {/* Play/Pause Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={onToggleAnimation}
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
            onClick={() => onSetToolMode('add')}
            className={`bg-black/40 text-white hover:bg-black/60 border-none rounded-full ${toolMode === 'add' ? 'ring-2 ring-white' : ''}`}
            aria-label="Add Shape Tool"
          >
            <Plus className="w-5 h-5" />
          </Button>
          <Button
            variant="outline" 
            size="icon"
            onClick={() => onSetToolMode('remove')}
            className={`bg-black/40 text-white hover:bg-black/60 border-none rounded-full ${toolMode === 'remove' ? 'ring-2 ring-white' : ''}`}
            aria-label="Remove Shape Tool"
          >
            <Eraser className="w-5 h-5" />
          </Button>
        </div>

        {/* Download Button */}
        <Button
          variant="outline" 
          size="icon"
          onClick={onDownloadSVG}
          className="bg-black/40 text-white hover:bg-black/60 border-none rounded-full pointer-events-auto"
          aria-label="Download as SVG"
        >
          <Download className="w-5 h-5" />
        </Button>
      </div>
    </>
  );
}