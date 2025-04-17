'use client';

import React, { createContext, useContext, ReactNode, useState } from 'react';

// Define the shape of the context data
interface SimulationActionsContextType {
  isPlaying: boolean;
  handlePlayPause: () => void;
  handleRestart: () => void;
  handleLoadSettings: () => void; // Simplified for now, might need event later
  handleDownloadSettings: () => void;
  handleDownloadSvg: () => void;
  handleAddBlob: () => void;
  handleRemoveBlob: () => void;
}

// Create the context with a default value (can be null or default functions)
const SimulationActionsContext = createContext<SimulationActionsContextType | undefined>(
  undefined
);

// Create a provider component
interface SimulationActionsProviderProps {
  children: ReactNode;
  // Update the actions type to include togglePlayPause
  actions: Omit<SimulationActionsContextType, 'isPlaying' | 'handlePlayPause'> & { togglePlayPause?: () => void };
}

export const SimulationActionsProvider: React.FC<SimulationActionsProviderProps> = ({ children, actions }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayPause = () => {
    setIsPlaying(prev => !prev);
    // Potentially call a play/pause action from the provided actions if needed
    actions.togglePlayPause?.(); // Call the actual toggle function from props
  };

  // Combine internal state management (isPlaying) with provided actions
  const value = {
    ...actions,
    isPlaying,
    handlePlayPause,
  };

  return (
    <SimulationActionsContext.Provider value={value}>
      {children}
    </SimulationActionsContext.Provider>
  );
};

// Create a custom hook for easy consumption
export const useSimulationActions = () => {
  const context = useContext(SimulationActionsContext);
  if (context === undefined) {
    throw new Error('useSimulationActions must be used within a SimulationActionsProvider');
  }
  return context;
};
