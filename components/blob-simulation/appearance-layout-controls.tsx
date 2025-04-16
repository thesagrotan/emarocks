import React from "react";
import { SimulationParams } from "./types";
import { PhysicsControls } from "./PhysicsControls";
import { StyleControls } from "./StyleControls";

interface AppearanceLayoutControlsProps {
    params: SimulationParams;
    onParamChange: (key: string, value: any) => void;
    paramDescriptions: Record<string, string>;
    currentTheme: string;
    isAnimating: boolean;
}

export function AppearanceLayoutControls({
    params,
    onParamChange,
    paramDescriptions,
    currentTheme,
    isAnimating
}: AppearanceLayoutControlsProps) {

    return (
        <div className="space-y-6">
            {/* Physics Controls Group */}
            <PhysicsControls
                params={params}
                onParamChange={onParamChange}
                isAnimating={isAnimating}
                paramDescriptions={paramDescriptions}
            />

            {/* Style Controls Group */}
             <StyleControls
                params={params}
                onParamChange={onParamChange}
                paramDescriptions={paramDescriptions}
                currentTheme={currentTheme}
             />
        </div>
    );
}
