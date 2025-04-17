import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SimulationParams } from "./types";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button"; // Import Button

interface RightControlsPanelProps {
    params: SimulationParams;
    onParamChange: (key: string, value: any) => void;
    isAnimating: boolean;
    paramDescriptions: Record<string, string>;
}

export function RightControlsPanel({
    params,
    onParamChange,
    isAnimating,
    paramDescriptions
}: RightControlsPanelProps) {

    const renderTooltip = (paramKey: string) => (
        <TooltipProvider>
            <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 opacity-50 cursor-help">
                        <Info className="h-3 w-3" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
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
                    disabled={isAnimating && (id === 'shapeCount' || id === 'edgePointCount' || id === 'minBlobSize')}
                />
                <span className="text-xs w-10 text-right">{(params[id] as number).toFixed(id === 'shapeCount' || id === 'edgePointCount' || id === 'minBlobSize' || id === 'restrictedAreaSize' ? 0 : 2)}</span>
            </div>
        </div>
    );

    const renderSwitch = (id: keyof SimulationParams, label: string) => (
        <div className="flex items-center justify-between space-x-2">
            <Label htmlFor={id} className="flex items-center">
                {label} {renderTooltip(id)}
            </Label>
            <Switch
                id={id}
                checked={params[id] as boolean}
                onCheckedChange={(checked) => onParamChange(id, checked)}
            />
        </div>
    );

    return (
        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle>Simulation Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Physics Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium">Physics</h3>
                    {renderSlider('shapeCount', 'Blob Count', 1, 500, 1)}
                    {renderSlider('edgePointCount', 'Edge Points', 3, 50, 1)}
                    {renderSlider('minBlobSize', 'Min Blob Size', 1, 50, 1)}
                    {renderSlider('repelDistance', 'Repel Distance', 0, 64, 0.1)}
                    {renderSlider('springTension', 'Spring Tension', 0.01, 1, 0.01)}
                    {renderSlider('interactionStrength', 'Interaction Strength', 0, 0.5, 0.005)}
                    {renderSlider('damping', 'Damping', 0.5, 1, 0.01)}
                    {renderSlider('speed', 'Speed', 0.1, 5, 0.1)}
                    {renderSlider('maxExpansionFactor', 'Max Expansion', 1, 3, 0.05)}
                    {/* Gravity slider can be added here if needed */}
                </div>

                {/* Container Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium">Container</h3>
                    {renderSlider('containerMargin', 'Margin', 0, 100, 1)}
                    {renderSwitch('isRoundedContainer', 'Rounded Container')}
                    {renderSwitch('showBorder', 'Show Border')}
                </div>

                {/* Restricted Area Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium">Restricted Area</h3>
                    {renderSwitch('restrictedAreaEnabled', 'Enable Restricted Area')}
                    {params.restrictedAreaEnabled && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="restrictedAreaLetter" className="flex items-center">
                                    Letter {renderTooltip("restrictedAreaLetter")}
                                </Label>
                                <Input
                                    id="restrictedAreaLetter"
                                    value={params.restrictedAreaLetter}
                                    onChange={(e) => onParamChange('restrictedAreaLetter', e.target.value.slice(0, 1))}
                                    maxLength={1}
                                    className="w-16 text-center"
                                />
                            </div>
                            {renderSlider('restrictedAreaSize', 'Letter Size', 10, CANVAS_SIZE || 512, 1)}
                            {/* Add X/Y position controls if manual positioning is desired */}
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// Define CANVAS_SIZE or import it if available globally
const CANVAS_SIZE = 512;
