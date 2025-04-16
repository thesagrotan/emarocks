import React from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SimulationParams } from "./types";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PhysicsControlsProps {
    params: SimulationParams;
    onParamChange: (key: string, value: any) => void;
    isAnimating: boolean;
    paramDescriptions: Record<string, string>;
}

export function PhysicsControls({
    params,
    onParamChange,
    isAnimating,
    paramDescriptions
}: PhysicsControlsProps) {

    const renderTooltip = (paramKey: string) => (
        <TooltipProvider>
            <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 opacity-50 cursor-help">
                        <Info className="h-3 w-3" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                    <p>{paramDescriptions[paramKey]}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );

    const renderSlider = (id: keyof SimulationParams, label: string, min: number, max: number, step: number) => (
        <div className="space-y-2">
            <Label htmlFor={id} className="flex items-center">
                {label} {renderTooltip(id)}
            </Label>
            <div className="flex items-center gap-2">
                <Slider
                    id={id}
                    min={min} max={max} step={step}
                    value={[params[id] as number]}
                    onValueChange={([value]) => onParamChange(id, value)}
                    // Disable structural params during animation
                    disabled={isAnimating && (id === 'shapeCount' || id === 'edgePointCount' || id === 'minBlobSize')}
                />
                <span className="text-xs w-10 text-right">{(params[id] as number).toFixed(id === 'shapeCount' || id === 'edgePointCount' || id === 'minBlobSize' ? 0 : 2)}</span>
            </div>
        </div>
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Physics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {renderSlider('shapeCount', 'Blob Count', 1, 500, 1)}
                {renderSlider('edgePointCount', 'Edge Points', 3, 50, 1)}
                {renderSlider('minBlobSize', 'Min Blob Size', 1, 50, 1)}
                {renderSlider('repelDistance', 'Repel Distance', 0, 20, 0.1)}
                {renderSlider('springTension', 'Spring Tension', 0.01, 1, 0.01)}
                {renderSlider('interactionStrength', 'Interaction Strength', 0, 0.5, 0.005)}
                {renderSlider('damping', 'Damping', 0.5, 1, 0.01)}
                {renderSlider('speed', 'Speed', 0.1, 5, 0.1)}
                {renderSlider('maxExpansionFactor', 'Max Expansion', 1, 3, 0.05)}
                {/* Gravity slider can be added here if needed */}
            </CardContent>
        </Card>
    );
}
