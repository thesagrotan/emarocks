import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SimulationParams } from "./types";
import { Info } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"; // Import Accordion
import { EditableSliderValue } from './EditableSliderValue'; // Import EditableSliderValue

interface LeftControlsPanelProps {
    params: SimulationParams;
    onParamChange: (key: string, value: any) => void;
    onRestart: () => void;
    onDownloadSVG: () => void;
    isAnimating: boolean;
    paramDescriptions: Record<string, string>;
}

export function LeftControlsPanel({
    params,
    onParamChange,
    onRestart,
    onDownloadSVG,
    isAnimating,
    paramDescriptions
}: LeftControlsPanelProps) {

    const renderTooltip = (paramKey: keyof SimulationParams | string) => ( // Use keyof SimulationParams for better type safety where possible
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="ml-1 h-5 w-5 p-0 opacity-50 hover:opacity-100">
                        <Info className="h-4 w-4" />
                        <span className="sr-only">Info</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs z-50"> {/* Added z-index */}
                    <p className="text-sm">{paramDescriptions[paramKey] || 'No description available.'}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );

    const renderColorInput = (id: keyof SimulationParams, label: string) => (
        <div className="flex items-center justify-between space-x-2 py-1"> {/* Added padding */}
            <Label htmlFor={id} className="text-xs font-medium flex items-center"> {/* Reduced font size */}
                {label}
                {renderTooltip(id)}
            </Label>
            <div className="flex items-center space-x-1.5"> {/* Reduced spacing */}
                <Input
                    id={id}
                    type="color"
                    value={params[id] as string}
                    onChange={(e) => onParamChange(id, e.target.value)}
                    className="w-7 h-7 p-0.5 border rounded" // Adjusted size
                />
                <Input
                    type="text"
                    value={params[id] as string}
                    onChange={(e) => onParamChange(id, e.target.value)}
                    className="w-20 h-7 text-xs px-1.5" // Adjusted size
                    aria-label={`${label} hex value`}
                />
            </div>
        </div>
    );

    const renderSlider = (id: keyof SimulationParams, label: string, min: number, max: number, step: number) => (
        <div className="space-y-1.5"> {/* Reduced vertical spacing */}
            <div className="flex items-center justify-between">
                <Label htmlFor={id} className="text-xs font-medium flex items-center"> {/* Reduced font size */}
                    {label}
                    {renderTooltip(id)}
                </Label>
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
                />
                <EditableSliderValue
                    value={params[id] as number}
                    min={min}
                    max={max}
                    step={step}
                    onChange={(newValue) => onParamChange(id, newValue)}
                    className="w-16 h-7 text-xs" // Adjusted size
                />
            </div>
        </div>
    );


    return (
        <Card className="w-full max-w-sm border-none shadow-none"> {/* Removed border/shadow */}
            <CardContent className="p-3 space-y-0 overflow-y-auto flex-grow"> {/* Reduced padding, removed internal spacing */}
                <Accordion type="multiple" defaultValue={['actions', 'typography', 'style-light', 'style-dark']} className="w-full">

                    {/* Action Buttons Section */}
                    <AccordionItem value="actions" className="border-b-0">
                        <AccordionTrigger className="text-sm font-semibold py-2 hover:no-underline">Actions</AccordionTrigger>
                        <AccordionContent className="pt-1 pb-3 space-y-2">
                            <Button onClick={onRestart} className="w-full h-8 text-xs">Restart Simulation</Button> {/* Adjusted size */}
                            <Button onClick={onDownloadSVG} variant="outline" className="w-full h-8 text-xs">Download SVG</Button> {/* Adjusted size */}
                            {/* Add Load button here if implemented */}
                        </AccordionContent>
                    </AccordionItem>

                    {/* Typography Section */}
                    <AccordionItem value="typography" className="border-b-0">
                        <AccordionTrigger className="text-sm font-semibold py-2 hover:no-underline">Typography</AccordionTrigger>
                        <AccordionContent className="pt-1 pb-3 space-y-3">
                            <div className="flex items-center justify-between space-x-2 py-1">
                                <Label htmlFor="fontFamily" className="text-xs font-medium flex items-center">
                                    Font Family
                                    {renderTooltip('fontFamily')}
                                </Label>
                                <Input
                                    id="fontFamily"
                                    type="text"
                                    value={params.fontFamily || ''}
                                    onChange={(e) => onParamChange('fontFamily', e.target.value)}
                                    placeholder="System Default"
                                    className="w-32 h-7 text-xs px-1.5" // Adjusted size
                                />
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Style Section (Light) */}
                    <AccordionItem value="style-light" className="border-b-0">
                        <AccordionTrigger className="text-sm font-semibold py-2 hover:no-underline">Style (Light)</AccordionTrigger>
                        <AccordionContent className="pt-1 pb-3 space-y-2">
                            {renderColorInput('backgroundColor', 'Background')}
                            {renderColorInput('blobFillColor', 'Blob Fill')}
                            {renderSlider('blobFillOpacity', 'Fill Opacity', 0, 1, 0.01)}
                            {renderColorInput('blobBorderColor', 'Blob Border')}
                            {renderColorInput('letterColor', 'Letter')}
                        </AccordionContent>
                    </AccordionItem>

                    {/* Style Section (Dark) */}
                    <AccordionItem value="style-dark" className="border-b-0">
                        <AccordionTrigger className="text-sm font-semibold py-2 hover:no-underline">Style (Dark)</AccordionTrigger>
                        <AccordionContent className="pt-1 pb-3 space-y-2">
                            {renderColorInput('darkBackgroundColor', 'Background')}
                            {renderColorInput('darkBlobFillColor', 'Blob Fill')}
                            {renderSlider('darkBlobFillOpacity', 'Fill Opacity', 0, 1, 0.01)}
                            {renderColorInput('darkBlobBorderColor', 'Blob Border')}
                            {renderColorInput('darkLetterColor', 'Letter')}
                        </AccordionContent>
                    </AccordionItem>

                </Accordion> {/* Added closing tag */}
            </CardContent> {/* Added closing tag */}
        </Card> {/* Added closing tag */}
    );
}
