import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, RotateCcw, Download, Upload, Settings, FileJson } from "lucide-react";
import { SimulationParams } from "./types";
import { ParamDescriptions } from "./param-descriptions";
import { EditableSliderValue } from "./EditableSliderValue"; // Import EditableSliderValue component

interface SimulationPhysicsPanelProps {
    params: SimulationParams;
    onParamChange: (key: string, value: any) => void;
    onRestart: () => void;
    onDownloadSVG: () => void;
    onDownloadSettings: () => void;
    onLoadSettings: (event: React.ChangeEvent<HTMLInputElement>) => void;
    triggerFileInput: () => void;
    isAnimating: boolean;
    paramDescriptions: ParamDescriptions;
    canvasSize: number; // Although passed, might not be directly used in physics panel
}

export function SimulationPhysicsPanel({
    params,
    onParamChange,
    onRestart,
    onDownloadSVG,
    onDownloadSettings,
    onLoadSettings, // Keep this prop for the hidden input
    triggerFileInput, // Keep this prop to trigger the input
    isAnimating,
    paramDescriptions,
}: SimulationPhysicsPanelProps) {

    // Hidden file input ref
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const renderTooltip = (paramKey: keyof SimulationParams) => (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="ml-2 h-5 w-5 p-0">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        <span className="sr-only">Info</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                    <p className="text-sm">{paramDescriptions[paramKey] || 'No description available.'}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );

    const renderSlider = (id: keyof SimulationParams, label: string, min: number, max: number, step: number) => (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label htmlFor={id} className="text-sm font-medium">
                    {label}
                </Label>
                {renderTooltip(id)}
            </div>
            <div className="flex items-center space-x-2">
                <Slider
                    id={id}
                    min={min}
                    max={max}
                    step={step}
                    value={[params[id] as number]}
                    onValueChange={(value) => onParamChange(id, value[0])}
                    className="flex-grow"
                    // Example: Disable structural params while animating
                    // disabled={isAnimating && (id === 'shapeCount' || id === 'edgePointCount' || id === 'minBlobSize')}
                />
                <EditableSliderValue
                    value={params[id] as number}
                    min={min}
                    max={max}
                    step={step}
                    onChange={(value) => onParamChange(id, value)}
                    className="w-12 text-right"
                />
            </div>
        </div>
    );

    return (
        <Card className="h-full flex flex-col">
            <CardContent className="space-y-4 overflow-y-auto flex-grow">
                {/* Simulation Parameters */}
                <div className="space-y-4">
                    <h4 className="text-sm font-semibold mb-2">Physics & Blobs</h4>
                    {renderSlider('shapeCount', 'Shape Count', 10, 1000, 10)}
                    {renderSlider('edgePointCount', 'Edge Points', 3, 40, 1)}
                    {renderSlider('minBlobSize', 'Min Size', 1, 20, 1)}
                    {renderSlider('repelDistance', 'Repel Dist', 0, 10, 0.5)}
                    {renderSlider('springTension', 'Tension', 0.01, 1, 0.01)}
                    {renderSlider('interactionStrength', 'Interaction', 0, 0.5, 0.01)}
                    {renderSlider('gravity', 'Gravity', -0.5, 0.5, 0.01)}
                    {renderSlider('damping', 'Damping', 0.1, 1, 0.01)}
                    {renderSlider('maxExpansionFactor', 'Expansion', 1, 3, 0.1)}
                    {renderSlider('speed', 'Speed', 0.1, 5, 0.1)}
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 border-t pt-4">
                     <h4 className="text-sm font-semibold mb-2">Actions</h4>
                     <Button onClick={onRestart} variant="outline" className="w-full">
                         <RotateCcw className="mr-2 h-4 w-4" /> Restart Simulation
                     </Button>
                     <Button onClick={onDownloadSVG} variant="outline" className="w-full">
                         <Download className="mr-2 h-4 w-4" /> Download SVG
                     </Button>
                     <Button onClick={onDownloadSettings} variant="outline" className="w-full">
                         <FileJson className="mr-2 h-4 w-4" /> Download Settings
                     </Button>
                     {/* Hidden file input for loading settings */}
                     <input
                         type="file"
                         ref={fileInputRef} // Use ref defined here
                         onChange={onLoadSettings}
                         accept=".json"
                         style={{ display: 'none' }}
                         id="load-settings-input-physics" // Use a unique ID if needed
                     />
                     {/* Button to trigger the hidden file input */}
                     {/* Modify triggerFileInput in parent to click this specific input if needed */}
                     <Button onClick={triggerFileInput} variant="outline" className="w-full">
                         <Upload className="mr-2 h-4 w-4" /> Load Settings
                     </Button>
                </div>
            </CardContent>
        </Card>
    );
}
