import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SimulationParams } from "./types";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card"; // Keep CardContent for padding
import { EditableSliderValue } from './EditableSliderValue'; // Import the new component
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Added Select
import { Textarea } from "@/components/ui/textarea"; // Added Textarea

interface RestrictedAreaControlsProps {
    params: SimulationParams;
    onParamChange: (key: keyof SimulationParams, value: any) => void; // Use keyof SimulationParams
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
        // Adjust label based on shape type if needed, e.g., for restrictedAreaSize
        const dynamicLabel = id === 'restrictedAreaSize'
            ? (params.restrictedAreaShape === 'letter' ? 'Font Size' : 'SVG Scale')
            : label;
        return (
            <div className="space-y-2">
                 <div className="flex justify-between items-center"> {/* Container for label */}
                    <Label htmlFor={id as string} className="flex items-center text-xs">
                        {dynamicLabel} {renderTooltip(id as string)}
                    </Label>
                </div>
                <div className="flex items-center gap-2">
                    <Slider
                        id={id as string}
                        min={min} max={max} step={step}
                        value={[params[id] as number]}
                        onValueChange={([value]) => onParamChange(id, value)}
                    />
                    <EditableSliderValue
                        value={params[id] as number}
                        min={min}
                        max={max}
                        step={step}
                        onChange={(newValue) => onParamChange(id, newValue)}
                        className="w-12 shrink-0"
                    />
                </div>
            </div>
        );
    }

    const renderSwitch = (id: keyof SimulationParams, label: string) => (
        <div className="flex items-center justify-between space-x-2 py-1">
            <Label htmlFor={id as string} className="flex items-center text-xs">
                {label} {renderTooltip(id as string)}
            </Label>
            <Switch
                id={id as string}
                checked={params[id] as boolean}
                onCheckedChange={(checked) => onParamChange(id, checked)}
            />
        </div>
    );

    return (
        <CardContent className="p-4 space-y-4">
            {renderSwitch('restrictedAreaEnabled', 'Enable Restricted Area')}
            {params.restrictedAreaEnabled && (
                <>
                    {/* Shape Type Selector */}
                    <div className="space-y-2">
                        <Label htmlFor="restrictedAreaShape" className="flex items-center text-xs">
                            Shape Type {renderTooltip("restrictedAreaShape")}
                        </Label>
                        <Select
                            value={params.restrictedAreaShape}
                            onValueChange={(value: 'letter' | 'svg') => onParamChange('restrictedAreaShape', value)}
                        >
                            <SelectTrigger id="restrictedAreaShape" className="h-8">
                                <SelectValue placeholder="Select shape type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="letter">Letter</SelectItem>
                                <SelectItem value="svg">SVG Path</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Conditional Inputs based on Shape Type */}
                    {params.restrictedAreaShape === 'letter' && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="restrictedAreaLetter" className="flex items-center text-xs">
                                    Letter {renderTooltip("restrictedAreaLetter")}
                                </Label>
                                <Input
                                    id="restrictedAreaLetter"
                                    value={params.restrictedAreaLetter}
                                    onChange={(e) => onParamChange('restrictedAreaLetter', e.target.value.slice(0, 1))}
                                    maxLength={1}
                                    className="w-16 text-center h-8"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="fontFamily" className="flex items-center text-xs">
                                    Font Family {renderTooltip("fontFamily")}
                                </Label>
                                <Input
                                    id="fontFamily"
                                    value={params.fontFamily || ''}
                                    onChange={(e) => onParamChange('fontFamily', e.target.value)}
                                    placeholder="e.g., Arial"
                                    className="h-8"
                                />
                            </div>
                        </>
                    )}

                    {params.restrictedAreaShape === 'svg' && (
                        <div className="space-y-2">
                            <Label htmlFor="svgPathString" className="flex items-center text-xs">
                                SVG Path Data {renderTooltip("svgPathString")}
                            </Label>
                            <Textarea
                                id="svgPathString"
                                placeholder="e.g., M10 10 H 90 V 90 H 10 Z"
                                value={params.svgPathString}
                                onChange={(e) => onParamChange('svgPathString', e.target.value)}
                                rows={4} // Adjust rows as needed
                                className="font-mono text-xs"
                            />
                            <p className="text-xs text-muted-foreground">
                                Enter the 'd' attribute value from an SVG &lt;path&gt; element.
                            </p>
                        </div>
                    )}

                    {/* Common Controls (Size/Scale) */}
                    {renderSlider('restrictedAreaSize', 'Size/Scale', 10, canvasSize, 1)}

                    {/* Add X/Y position controls if manual positioning is desired */}
                </>
            )}
        </CardContent>
    );
}
