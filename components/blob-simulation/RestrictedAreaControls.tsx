import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SimulationParams } from "./types";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RestrictedAreaControlsProps {
    params: SimulationParams;
    onParamChange: (key: string, value: any) => void;
    paramDescriptions: Record<string, string>;
    canvasSize: number;
}

export function RestrictedAreaControls({
    params,
    onParamChange,
    paramDescriptions,
    canvasSize
}: RestrictedAreaControlsProps) {

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
                />
                <span className="text-xs w-10 text-right">{(params[id] as number).toFixed(0)}</span>
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
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Restricted Area</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                        {renderSlider('restrictedAreaSize', 'Letter Size', 10, canvasSize, 1)}
                        <div className="space-y-2">
                            <Label htmlFor="fontFamily" className="flex items-center">
                                Font Family {renderTooltip("fontFamily")}
                            </Label>
                            <Input
                                id="fontFamily"
                                value={params.fontFamily || ''}
                                onChange={(e) => onParamChange('fontFamily', e.target.value)}
                                placeholder="e.g., Arial, Times New Roman"
                            />
                        </div>
                        {/* Add X/Y position controls if manual positioning is desired */}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
