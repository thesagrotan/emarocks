import React from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SimulationParams } from "./types";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card"; // Keep CardContent for padding
import { EditableSliderValue } from './EditableSliderValue'; // Import the new component

interface ContainerControlsProps {
    params: SimulationParams;
    onParamChange: (key: string, value: any) => void;
    paramDescriptions: Record<string, string>;
}

export function ContainerControls({
    params,
    onParamChange,
    paramDescriptions
}: ContainerControlsProps) {

    const renderTooltip = (paramKey: string) => (
        <TooltipProvider>
            <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 opacity-60 hover:opacity-100 cursor-help">
                        <Info className="h-3 w-3" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                    <p>{paramDescriptions[paramKey]}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );

    const renderSlider = (id: keyof SimulationParams, label: string, min: number, max: number, step: number) => {
        return (
            <div className="space-y-2">
                <div className="flex justify-between items-center"> {/* Container for label */}
                    <Label htmlFor={id} className="flex items-center text-xs">
                        {label} {renderTooltip(id)}
                    </Label>
                    {/* Removed min/max span */}
                </div>
                <div className="flex items-center gap-2">
                    <Slider
                        id={id}
                        min={min} max={max} step={step}
                        value={[params[id] as number]}
                        onValueChange={([value]) => onParamChange(id, value)}
                    />
                     {/* Replace span with EditableSliderValue */}
                    <EditableSliderValue
                        value={params[id] as number}
                        min={min}
                        max={max}
                        step={step}
                        onChange={(newValue) => onParamChange(id, newValue)}
                        className="w-12 shrink-0" // Adjust width as needed
                    />
                </div>
            </div>
        );
    }

    const renderSwitch = (id: keyof SimulationParams, label: string) => (
        <div className="flex items-center justify-between space-x-2 py-1">
            <Label htmlFor={id} className="flex items-center text-xs">
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
        <CardContent className="p-4 space-y-4">
            {renderSlider('containerMargin', 'Margin', 0, 100, 1)}
            {renderSwitch('isRoundedContainer', 'Rounded Container')}
            {renderSwitch('showBorder', 'Show Border')}
        </CardContent>
    );
}
