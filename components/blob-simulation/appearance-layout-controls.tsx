import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { SimulationParams, RestrictedAreaParams } from "./types";
import { paramDescriptions } from "./param-descriptions";
import { drawSimulation } from './SimulationCanvas';
import { getSimulationColors } from '@/shared/utils';
import { Blob } from './blob';
import { EditableSliderValue } from './EditableSliderValue'; // Import the new component
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"; // Import Accordion

const MAIN_CANVAS_SIZE = 512;

interface AppearanceLayoutControlsProps {
    params: SimulationParams;
    onParamChange: (key: string, value: any) => void;
    paramDescriptions: typeof paramDescriptions;
    currentTheme: string;
    isAnimating: boolean;
    mainCanvasRef: React.RefObject<HTMLCanvasElement>;
    blobsRef: React.RefObject<Blob[]>;
    miniCanvasSize: number;
    onMiniCanvasSizeChange: (value: number) => void;
    redrawMiniCanvasTrigger: number;
}

// Helper to get device pixel ratio safely
const getDevicePixelRatio = () => (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);

export function AppearanceLayoutControls({
    params,
    onParamChange,
    paramDescriptions,
    currentTheme,
    isAnimating,
    mainCanvasRef,
    blobsRef,
    miniCanvasSize,
    onMiniCanvasSizeChange,
    redrawMiniCanvasTrigger,
}: AppearanceLayoutControlsProps) {
    const miniCanvasRef = useRef<HTMLCanvasElement>(null);

    // Memoized function to calculate *scaled* restricted area params
    const calculateRestrictedAreaParams = useCallback((targetCanvasWidth: number, targetCanvasHeight: number): RestrictedAreaParams | undefined => {
        const { restrictedAreaEnabled, restrictedAreaSize, restrictedAreaLetter, restrictedAreaMargin, fontFamily, restrictedAreaX, restrictedAreaY } = params;
        if (!restrictedAreaEnabled) return undefined;

        // Calculate scale factor based on the target canvas size relative to the main canvas size
        const scaleFactor = targetCanvasWidth / MAIN_CANVAS_SIZE;

        // Scale the size and margin
        const scaledSize = restrictedAreaSize * scaleFactor;
        const scaledMargin = restrictedAreaMargin * scaleFactor;

        // Calculate base X/Y (centering or using provided value) relative to MAIN_CANVAS_SIZE
        const baseX = (typeof restrictedAreaX === 'number') ? restrictedAreaX : (MAIN_CANVAS_SIZE / 2) - (restrictedAreaSize / 2);
        const baseY = (typeof restrictedAreaY === 'number') ? restrictedAreaY : (MAIN_CANVAS_SIZE / 2) - (restrictedAreaSize / 2);

        // Scale the position
        const scaledX = baseX * scaleFactor;
        const scaledY = baseY * scaleFactor;

        return {
            x: scaledX,
            y: scaledY,
            size: scaledSize,
            margin: scaledMargin,
            letter: restrictedAreaLetter,
            fontFamily
        };
    }, [params]);

    // Effect to draw the mini canvas preview
    useEffect(() => {
        const miniCanvas = miniCanvasRef.current;
        if (!miniCanvas) {
            console.warn("Mini canvas ref not available");
            return;
        }

        const miniCtx = miniCanvas.getContext('2d');
        if (!miniCtx) {
            console.warn("Could not get 2D context from mini canvas");
            return;
        }

        // --- Dimension Setting ---
        const dpi = getDevicePixelRatio();
        // Set internal bitmap size based on the desired display size and DPI
        miniCanvas.width = miniCanvasSize * dpi;
        miniCanvas.height = miniCanvasSize * dpi;
        // Set CSS display size
        miniCanvas.style.width = `${miniCanvasSize}px`;
        miniCanvas.style.height = `${miniCanvasSize}px`;
        // Reset transform and scale for DPI
        miniCtx.setTransform(dpi, 0, 0, dpi, 0, 0);
        // --- End Dimension Setting ---

        // Clear the mini canvas before drawing
        miniCtx.clearRect(0, 0, miniCanvasSize, miniCanvasSize);

        // Draw the simulation elements onto the mini canvas
        drawSimulation(
            miniCanvasRef,
            blobsRef, // Use the passed blobsRef
            params,
            currentTheme,
            calculateRestrictedAreaParams,
            miniCanvasSize
        );

    }, [redrawMiniCanvasTrigger, miniCanvasSize, currentTheme, params, calculateRestrictedAreaParams, isAnimating, blobsRef]); // Add blobsRef to dependency array

    const renderTooltip = (paramKey: keyof SimulationParams) => (
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
                {/* Use EditableSliderValue */}
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

    const renderSwitch = (id: keyof SimulationParams, label: string) => (
        <div className="flex items-center justify-between space-x-2 py-1"> {/* Added padding */}
            <Label htmlFor={id} className="text-xs font-medium flex items-center cursor-pointer"> {/* Reduced font size */}
                {label}
                {renderTooltip(id)}
            </Label>
            <Switch
                id={id}
                checked={params[id] as boolean}
                onCheckedChange={(checked) => onParamChange(id, checked)}
                className="scale-75" // Make switch smaller
            />
        </div>
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

    const colors = getSimulationColors(params, currentTheme);

    return (
        <Card className="h-full flex flex-col border-none shadow-none"> {/* Removed border/shadow */}
            <CardContent className="p-3 space-y-0 overflow-y-auto flex-grow"> {/* Reduced padding, removed internal spacing */}

                <Accordion type="multiple" defaultValue={['preview', 'container', 'colors', 'restricted-area']} className="w-full">

                    {/* Preview Section */}
                    <AccordionItem value="preview" className="border-b-0">
                        <AccordionTrigger className="text-sm font-semibold py-2 hover:no-underline">Preview</AccordionTrigger>
                        <AccordionContent className="pt-1 pb-3 space-y-2">
                            <div className="flex justify-center items-center p-2 rounded-md" style={{ backgroundColor: colors.backgroundColor }}>
                                <canvas
                                    ref={miniCanvasRef}
                                    className="rounded-md border border-border"
                                />
                            </div>
                            <div className="flex items-center space-x-2 pt-1">
                                <Slider
                                    min={100}
                                    max={300}
                                    step={10}
                                    value={[miniCanvasSize]}
                                    onValueChange={(value) => onMiniCanvasSizeChange(value[0])}
                                    className="flex-grow"
                                    aria-label="Preview Size"
                                />
                                <EditableSliderValue
                                    value={miniCanvasSize}
                                    min={100}
                                    max={300}
                                    step={10}
                                    onChange={onMiniCanvasSizeChange}
                                    className="w-16 h-7 text-xs"
                                />
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Container Settings Section */}
                    <AccordionItem value="container" className="border-b-0">
                        <AccordionTrigger className="text-sm font-semibold py-2 hover:no-underline">Container</AccordionTrigger>
                        <AccordionContent className="pt-1 pb-3 space-y-3"> {/* Added spacing */}
                            {renderSlider('containerMargin', 'Margin', 0, 100, 1)}
                            {renderSwitch('isRoundedContainer', 'Rounded')}
                            {renderSwitch('showBorder', 'Border')}
                        </AccordionContent>
                    </AccordionItem>

                    {/* Color Settings Section */}
                    <AccordionItem value="colors" className="border-b-0">
                        <AccordionTrigger className="text-sm font-semibold py-2 hover:no-underline">Colors ({currentTheme === 'light' ? 'Light' : 'Dark'})</AccordionTrigger>
                        <AccordionContent className="pt-1 pb-3 space-y-2"> {/* Added spacing */}
                            {currentTheme === 'light' ? (
                                <>
                                    {renderColorInput('backgroundColor', 'Background')}
                                    {renderColorInput('blobFillColor', 'Blob Fill')}
                                    {renderSlider('blobFillOpacity', 'Fill Opacity', 0, 1, 0.01)}
                                    {renderColorInput('blobBorderColor', 'Blob Border')}
                                    {renderColorInput('letterColor', 'Letter')}
                                </>
                            ) : (
                                <>
                                    {renderColorInput('darkBackgroundColor', 'Background')}
                                    {renderColorInput('darkBlobFillColor', 'Blob Fill')}
                                    {renderSlider('darkBlobFillOpacity', 'Fill Opacity', 0, 1, 0.01)}
                                    {renderColorInput('darkBlobBorderColor', 'Blob Border')}
                                    {renderColorInput('darkLetterColor', 'Letter')}
                                </>
                            )}
                        </AccordionContent>
                    </AccordionItem>

                    {/* Restricted Area Settings Section */}
                    <AccordionItem value="restricted-area" className="border-b-0">
                        <AccordionTrigger className="text-sm font-semibold py-2 hover:no-underline">Restricted Area</AccordionTrigger>
                        <AccordionContent className="pt-1 pb-3 space-y-3"> {/* Added spacing */}
                            {renderSwitch('restrictedAreaEnabled', 'Enabled')}
                            {params.restrictedAreaEnabled && (
                                <>
                                    {params.restrictedAreaShape === 'letter' && (
                                        <>
                                            <div className="flex items-center justify-between space-x-2 py-1">
                                                <Label htmlFor="restrictedAreaLetter" className="text-xs font-medium flex items-center">
                                                    Letter
                                                    {renderTooltip('restrictedAreaLetter')}
                                                </Label>
                                                <Input
                                                    id="restrictedAreaLetter"
                                                    type="text"
                                                    maxLength={1}
                                                    value={params.restrictedAreaLetter}
                                                    onChange={(e) => onParamChange('restrictedAreaLetter', e.target.value)}
                                                    className="w-10 h-7 text-center text-xs px-1" // Adjusted size
                                                />
                                            </div>
                                            <div className="flex items-center justify-between space-x-2 py-1">
                                                <Label htmlFor="fontFamily" className="text-xs font-medium flex items-center">
                                                    Font Family
                                                    {renderTooltip('fontFamily')}
                                                </Label>
                                                <Input
                                                    id="fontFamily"
                                                    type="text"
                                                    value={params.fontFamily}
                                                    onChange={(e) => onParamChange('fontFamily', e.target.value)}
                                                    className="w-32 h-7 text-xs px-1.5" // Adjusted size
                                                />
                                            </div>
                                        </>
                                    )}
                                    {renderSlider('restrictedAreaSize', 'Size', 50, 500, 10)}
                                    {renderSlider('restrictedAreaMargin', 'Margin', 0, 50, 1)}
                                    <div className="text-xs text-muted-foreground pt-1">Use arrow keys to move the area. Shift+Arrow for larger steps.</div>
                                </>
                            )}
                        </AccordionContent>
                    </AccordionItem>

                </Accordion>

            </CardContent>
        </Card>
    );
}
