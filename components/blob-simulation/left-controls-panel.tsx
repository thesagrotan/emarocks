import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SimulationParams } from "./types";
import { Info } from "lucide-react";
import { ActionControls } from "./ActionControls"; // Import ActionControls

interface LeftControlsPanelProps {
    params: SimulationParams;
    onParamChange: (key: string, value: any) => void;
    onRestart: () => void;
    onDownloadSettings: () => void; // Add onDownloadSettings
    triggerFileInput: () => void; // Add triggerFileInput
    isAnimating: boolean;
    paramDescriptions: Record<string, string>;
}

export function LeftControlsPanel({
    params,
    onParamChange,
    onRestart,
    onDownloadSettings, // Destructure onDownloadSettings
    triggerFileInput, // Destructure triggerFileInput
    isAnimating,
    paramDescriptions
}: LeftControlsPanelProps) {

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

    return (
        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle>Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Action Buttons */}
                <ActionControls
                    onRestart={onRestart}
                    onDownloadSettings={onDownloadSettings}
                    triggerFileInput={triggerFileInput}
                />

                {/* Typography Section */}
                <div className="space-y-4">
                    {/* Removed the h3 tag that was causing the error */}
                    <Label htmlFor="fontFamily">Font Family</Label>
                    <Input
                        id="fontFamily"
                        value={params.fontFamily || ''}
                        onChange={(e) => onParamChange('fontFamily', e.target.value)}
                        placeholder="e.g., Arial, Times New Roman"
                    />
                </div>

                {/* Style Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium">Style (Light Mode)</h3>
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
                    <div className="space-y-2">
                        <Label htmlFor="blobFillOpacity" className="flex items-center">
                            Blob Fill Opacity {renderTooltip("blobFillOpacity")}
                        </Label>
                        <div className="flex items-center gap-2">
                            <Slider
                                id="blobFillOpacity"
                                min={0} max={1} step={0.01}
                                value={[params.blobFillOpacity]}
                                onValueChange={([value]) => onParamChange('blobFillOpacity', value)}
                            />
                            <span className="text-xs w-8 text-right">{params.blobFillOpacity.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Dark Mode Style Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium">Style (Dark Mode)</h3>
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
                    <div className="space-y-2">
                        <Label htmlFor="darkBlobFillOpacity" className="flex items-center">
                            Blob Fill Opacity {renderTooltip("darkBlobFillOpacity")}
                        </Label>
                        <div className="flex items-center gap-2">
                            <Slider
                                id="darkBlobFillOpacity"
                                min={0} max={1} step={0.01}
                                value={[params.darkBlobFillOpacity]}
                                onValueChange={([value]) => onParamChange('darkBlobFillOpacity', value)}
                            />
                            <span className="text-xs w-8 text-right">{params.darkBlobFillOpacity.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
