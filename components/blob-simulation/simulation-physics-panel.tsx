import React, { useRef } from "react";
import { SimulationParams } from "./types";
import { ActionControls } from "./ActionControls"; // Import group component
import { ContainerControls } from "./ContainerControls"; // Import ContainerControls
import { RestrictedAreaControls } from "./RestrictedAreaControls"; // Import RestrictedAreaControls

interface SimulationPhysicsPanelProps {
    params: SimulationParams;
    onParamChange: (key: string, value: any) => void;
    onRestart: () => void;
    onDownloadSVG: () => void;
    onDownloadSettings: () => void;
    onLoadSettings: (event: React.ChangeEvent<HTMLInputElement>) => void;
    triggerFileInput: () => void;
    paramDescriptions: Record<string, string>;
    canvasSize: number; // Add canvasSize prop
}

export function SimulationPhysicsPanel({
    params,
    onParamChange,
    onRestart,
    onDownloadSVG,
    onDownloadSettings,
    onLoadSettings,
    triggerFileInput,
    paramDescriptions,
    canvasSize // Destructure canvasSize
}: SimulationPhysicsPanelProps) {

    // Ref for the hidden file input remains here to be easily triggered
    const fileInputRef = useRef<HTMLInputElement>(null);

    const internalTriggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="space-y-6">
            {/* Action Controls Group */}
            <ActionControls
                onRestart={onRestart}
                onDownloadSVG={onDownloadSVG}
                onDownloadSettings={onDownloadSettings}
                onLoadSettings={onLoadSettings}
                triggerFileInput={internalTriggerFileInput} // Use internal trigger
            />
            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={onLoadSettings}
                accept=".json"
                style={{ display: 'none' }}
            />

            {/* Container Controls Group */}
            <ContainerControls
                params={params}
                onParamChange={onParamChange}
                paramDescriptions={paramDescriptions}
            />

            {/* Restricted Area Controls Group (Moved here) */}
            <RestrictedAreaControls
                params={params}
                onParamChange={onParamChange}
                paramDescriptions={paramDescriptions}
                canvasSize={canvasSize} // Pass canvasSize
            />
        </div>
    );
}
