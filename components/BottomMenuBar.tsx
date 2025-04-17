'use client';

import React from 'react'; // Removed useState
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Upload, Download, FileDown, PlusCircle, MinusCircle } from 'lucide-react';
import { useSimulationActions } from '@/contexts/SimulationActionsContext'; // Import the hook

const BottomMenuBar: React.FC = () => {
  // Get state and actions from context
  const { 
    isPlaying, 
    handlePlayPause, 
    handleRestart, 
    handleLoadSettings, 
    handleDownloadSettings, 
    handleDownloadSvg, 
    handleAddBlob, 
    handleRemoveBlob 
  } = useSimulationActions();

  // Removed local useState and console.log handlers

  return (
    <footer className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="flex items-center justify-center gap-x-2 p-2 bg-background border border-border rounded-lg shadow-md">
        {/* Group 1: Play/Pause, Restart */}
        <div className="flex items-center gap-x-1 border-r border-border pr-2">
          {/* Use context state and handler */}
          <Button variant="ghost" size="icon" onClick={handlePlayPause} aria-label={isPlaying ? "Pause" : "Play"}>
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          {/* Use context state and handler */}
          {isPlaying && (
            <Button variant="ghost" size="icon" onClick={handleRestart} aria-label="Restart">
              <RotateCcw className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Group 2: Load/Download Settings */}
        <div className="flex items-center gap-x-1 border-r border-border pr-2">
          {/* Use context handlers */}
          <Button variant="ghost" size="icon" onClick={handleLoadSettings} aria-label="Load settings">
            <Upload className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDownloadSettings()} aria-label="Download settings">
            <Download className="h-5 w-5" />
          </Button>
        </div>

        {/* Group 3: Download SVG */}
        <div className="flex items-center gap-x-1 border-r border-border pr-2">
          {/* Use context handler */}
          <Button variant="ghost" size="icon" onClick={handleDownloadSvg} aria-label="Download SVG">
            <FileDown className="h-5 w-5" />
          </Button>
        </div>

        {/* Group 4: Add/Remove Blob */}
        <div className="flex items-center gap-x-1">
          {/* Use context handlers */}
          <Button variant="ghost" size="icon" onClick={handleAddBlob} aria-label="Add blob">
            <PlusCircle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleRemoveBlob} aria-label="Remove blob">
            <MinusCircle className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </footer>
  );
};

export default BottomMenuBar;
