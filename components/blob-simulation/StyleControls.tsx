import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SimulationParams } from "./types";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

    const renderOpacitySlider = (id: keyof SimulationParams, label: string) => (
        <div className="space-y-2">
            <Label htmlFor={id} className="flex items-center">
                {label} {renderTooltip(id)}
            </Label>
            <div className="flex items-center gap-2">
                <Slider
                    id={id}
                    min={0} max={1} step={0.01}
                    value={[params[id] as number]}
                    onValueChange={([value]) => onParamChange(id, value)}
                />
                <span className="text-xs w-8 text-right">{(params[id] as number).toFixed(2)}</span>
            </div>
        </div>
    );

    const isDark = currentTheme === 'dark';

    return (
        <Card>
            <CardHeader>
                {/* Update title based on theme */}
                <CardTitle className="text-base">Style ({isDark ? 'Dark' : 'Light'} Mode)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4"> {/* Adjusted spacing */}
                {/* Conditionally render Light Mode settings */}
                {!isDark && (
                    <div className="space-y-4">
                        {/* <h4 className="text-sm font-medium">Light Mode</h4> */} {/* Title is now in CardHeader */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="backgroundColor">Background</Label>
                                <Input id="backgroundColor" type="color" value={params.backgroundColor} onChange={(e) => onParamChange('backgroundColor', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="blobFillColor">Blob Fill</Label>
                                <Input id="blobFillColor" type="color" value={params.blobFillColor} onChange={(e) => onParamChange('blobFillColor', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="blobBorderColor">Blob Border</Label>
                                <Input id="blobBorderColor" type="color" value={params.blobBorderColor} onChange={(e) => onParamChange('blobBorderColor', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="letterColor">Letter</Label>
                                <Input id="letterColor" type="color" value={params.letterColor} onChange={(e) => onParamChange('letterColor', e.target.value)} />
                            </div>
                        </div>
                        {renderOpacitySlider('blobFillOpacity', 'Blob Fill Opacity')}
                    </div>
                )}

                {/* Conditionally render Dark Mode settings */}
                {isDark && (
                    <div className="space-y-4">
                        {/* <h4 className="text-sm font-medium">Dark Mode</h4> */} {/* Title is now in CardHeader */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="darkBackgroundColor">Background</Label>
                                <Input id="darkBackgroundColor" type="color" value={params.darkBackgroundColor} onChange={(e) => onParamChange('darkBackgroundColor', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="darkBlobFillColor">Blob Fill</Label>
                                <Input id="darkBlobFillColor" type="color" value={params.darkBlobFillColor} onChange={(e) => onParamChange('darkBlobFillColor', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="darkBlobBorderColor">Blob Border</Label>
                                <Input id="darkBlobBorderColor" type="color" value={params.darkBlobBorderColor} onChange={(e) => onParamChange('darkBlobBorderColor', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="darkLetterColor">Letter</Label>
                                <Input id="darkLetterColor" type="color" value={params.darkLetterColor} onChange={(e) => onParamChange('darkLetterColor', e.target.value)} />
                            </div>
                        </div>
                        {renderOpacitySlider('darkBlobFillOpacity', 'Blob Fill Opacity')}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
