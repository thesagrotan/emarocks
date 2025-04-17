import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SimulationParams } from "./types";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card"; // Keep CardContent for padding
import { EditableSliderValue } from './EditableSliderValue'; // Import the new component

interface StyleControlsProps {
    params: SimulationParams;
    onParamChange: (key: string, value: any) => void;
    paramDescriptions: Record<string, string>;
    currentTheme: string; // Add currentTheme prop
}

export function StyleControls({
    params,
    onParamChange,
    paramDescriptions,
    currentTheme // Destructure currentTheme
}: StyleControlsProps) {

    const renderTooltip = (paramKey: string) => (
        <TooltipProvider>
            <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                    {/* Adjusted button style */}
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

    const renderOpacitySlider = (id: keyof SimulationParams, label: string) => {
        const min = 0;
        const max = 1;
        const step = 0.01;
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

    const isDark = currentTheme === 'dark';

    return (
        // Use CardContent directly for padding and structure within Accordion
        <CardContent className="p-4 space-y-4">
            {/* Conditionally render Light Mode settings */}
            {!isDark && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3"> {/* Adjusted gap */}
                        <div className="space-y-2">
                            <Label htmlFor="backgroundColor" className="text-xs">Background</Label> {/* Adjusted label size */}
                            <Input id="backgroundColor" type="color" value={params.backgroundColor} onChange={(e) => onParamChange('backgroundColor', e.target.value)} className="h-8 w-full"/> {/* Adjusted input height/width */}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="blobFillColor" className="text-xs">Blob Fill</Label> {/* Adjusted label size */}
                            <Input id="blobFillColor" type="color" value={params.blobFillColor} onChange={(e) => onParamChange('blobFillColor', e.target.value)} className="h-8 w-full"/> {/* Adjusted input height/width */}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="blobBorderColor" className="text-xs">Blob Border</Label> {/* Adjusted label size */}
                            <Input id="blobBorderColor" type="color" value={params.blobBorderColor} onChange={(e) => onParamChange('blobBorderColor', e.target.value)} className="h-8 w-full"/> {/* Adjusted input height/width */}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="letterColor" className="text-xs">Letter</Label> {/* Adjusted label size */}
                            <Input id="letterColor" type="color" value={params.letterColor} onChange={(e) => onParamChange('letterColor', e.target.value)} className="h-8 w-full"/> {/* Adjusted input height/width */}
                        </div>
                    </div>
                    {renderOpacitySlider('blobFillOpacity', 'Blob Fill Opacity')}
                </div>
            )}

            {/* Conditionally render Dark Mode settings */}
            {isDark && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3"> {/* Adjusted gap */}
                        <div className="space-y-2">
                            <Label htmlFor="darkBackgroundColor" className="text-xs">Background</Label> {/* Adjusted label size */}
                            <Input id="darkBackgroundColor" type="color" value={params.darkBackgroundColor} onChange={(e) => onParamChange('darkBackgroundColor', e.target.value)} className="h-8 w-full"/> {/* Adjusted input height/width */}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="darkBlobFillColor" className="text-xs">Blob Fill</Label> {/* Adjusted label size */}
                            <Input id="darkBlobFillColor" type="color" value={params.darkBlobFillColor} onChange={(e) => onParamChange('darkBlobFillColor', e.target.value)} className="h-8 w-full"/> {/* Adjusted input height/width */}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="darkBlobBorderColor" className="text-xs">Blob Border</Label> {/* Adjusted label size */}
                            <Input id="darkBlobBorderColor" type="color" value={params.darkBlobBorderColor} onChange={(e) => onParamChange('darkBlobBorderColor', e.target.value)} className="h-8 w-full"/> {/* Adjusted input height/width */}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="darkLetterColor" className="text-xs">Letter</Label> {/* Adjusted label size */}
                            <Input id="darkLetterColor" type="color" value={params.darkLetterColor} onChange={(e) => onParamChange('darkLetterColor', e.target.value)} className="h-8 w-full"/> {/* Adjusted input height/width */}
                        </div>
                    </div>
                    {renderOpacitySlider('darkBlobFillOpacity', 'Blob Fill Opacity')}
                </div>
            )}
        </CardContent>
    );
}
