import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { SimulationParams, RestrictedAreaParams } from "./types"; // Removed BlobShape import
import { paramDescriptions } from "./param-descriptions"; // Corrected casing
import { drawSimulation } from './SimulationCanvas';
import { getSimulationColors } from '@/shared/utils';
import { Blob } from './blob'; // Added Blob import

const MAIN_CANVAS_SIZE = 512;

interface AppearanceLayoutControlsProps {
    params: SimulationParams;
    onParamChange: (key: string, value: any) => void;
    paramDescriptions: typeof paramDescriptions; // Use typeof for the imported object
    currentTheme: string;
    isAnimating: boolean;
    // Mini Canvas Props
    mainCanvasRef: React.RefObject<HTMLCanvasElement>;
    blobsRef: React.RefObject<Blob[]>; // Changed BlobShape[] to Blob[]
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
    blobsRef, // Destructure blobsRef
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
                    <Button variant="ghost" size="icon" className="ml-2 h-5 w-5 p-0">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        <span className="sr-only">Info</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                    <p className="text-sm">{paramDescriptions[paramKey] || 'No description available.'}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );

    const renderSlider = (id: keyof SimulationParams, label: string, min: number, max: number, step: number) => (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label htmlFor={id} className="text-sm font-medium">
                    {label}
                </Label>
                {renderTooltip(id)}
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
                <span className="text-sm text-muted-foreground w-12 text-right">
                    {(params[id] as number).toFixed(step === 0.01 ? 2 : (step === 0.1 ? 1 : 0))}
                </span>
            </div>
        </div>
    );

    const renderSwitch = (id: keyof SimulationParams, label: string) => (
        <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center">
                <Label htmlFor={id} className="text-sm font-medium">
                    {label}
                </Label>
                {renderTooltip(id)}
            </div>
            <Switch
                id={id}
                checked={params[id] as boolean}
                onCheckedChange={(checked) => onParamChange(id, checked)}
            />
        </div>
    );

    const renderColorInput = (id: keyof SimulationParams, label: string) => (
        <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center">
                <Label htmlFor={id} className="text-sm font-medium">
                    {label}
                </Label>
                {renderTooltip(id)}
            </div>
            <div className="flex items-center space-x-2">
                <Input
                    id={id}
                    type="color"
                    value={params[id] as string}
                    onChange={(e) => onParamChange(id, e.target.value)}
                    className="w-10 h-8 p-1"
                />
                <Input
                    type="text"
                    value={params[id] as string}
                    onChange={(e) => onParamChange(id, e.target.value)}
                    className="w-20 h-8 text-sm"
                    aria-label={`${label} hex value`}
                />
            </div>
        </div>
    );

    const colors = getSimulationColors(params, currentTheme);

    return (
        <Card className="h-full flex flex-col">
            <CardContent className="space-y-4 overflow-y-auto flex-grow">

                {/* --- Appearance Section --- */}
                {/* Mini Canvas Preview */}
                <div className="space-y-2 border-t pt-4">
                    <Label className="text-sm font-medium">Preview</Label>
                    <div className="flex justify-center items-center p-2 rounded-md" style={{ backgroundColor: colors.backgroundColor }}>
                        <canvas
                            ref={miniCanvasRef}
                            className="rounded-md border border-border"
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Slider
                            min={40}
                            max={300}
                            step={4}
                            value={[miniCanvasSize]}
                            onValueChange={(value) => onMiniCanvasSizeChange(value[0])}
                            className="flex-grow"
                            aria-label="Preview Size"
                        />
                        <span className="text-sm text-muted-foreground w-12 text-right">
                            {miniCanvasSize}px
                        </span>
                    </div>
                </div>

                {/* Container Settings */}
                <div className="space-y-4 border-t pt-4">
                    <h4 className="text-sm font-semibold mb-2">Container</h4>
                    {renderSlider('containerMargin', 'Margin', 0, 100, 1)}
                    {renderSwitch('isRoundedContainer', 'Rounded Container')}
                    {renderSwitch('showBorder', 'Show Border')}
                </div>

                {/* Color Settings */}
                <div className="space-y-4 border-t pt-4">
                    <h4 className="text-sm font-semibold mb-2">Colors ({currentTheme === 'light' ? 'Light' : 'Dark'} Theme)</h4>
                    {currentTheme === 'light' ? (
                        <>
                            {renderColorInput('backgroundColor', 'Background')}
                            {renderColorInput('blobFillColor', 'Blob Fill')}
                            {renderSlider('blobFillOpacity', 'Blob Fill Opacity', 0, 1, 0.01)}
                            {renderColorInput('blobBorderColor', 'Blob Border')}
                            {renderColorInput('letterColor', 'Letter Color')}
                        </>
                    ) : (
                        <>
                            {renderColorInput('darkBackgroundColor', 'Background')}
                            {renderColorInput('darkBlobFillColor', 'Blob Fill')}
                            {renderSlider('darkBlobFillOpacity', 'Blob Fill Opacity', 0, 1, 0.01)}
                            {renderColorInput('darkBlobBorderColor', 'Blob Border')}
                            {renderColorInput('darkLetterColor', 'Letter Color')}
                        </>
                    )}
                </div>

                 {/* Restricted Area Settings */}
                 <div className="space-y-4 border-t pt-4">
                    <h4 className="text-sm font-semibold mb-2">Restricted Area</h4>
                    {renderSwitch('restrictedAreaEnabled', 'Enabled')}
                    {params.restrictedAreaEnabled && (
                        <>
                            {params.restrictedAreaShape === 'letter' && (
                                <>
                                    <div className="flex items-center justify-between space-x-2">
                                        <div className="flex items-center">
                                            <Label htmlFor="restrictedAreaLetter" className="text-sm font-medium">Letter</Label>
                                            {renderTooltip('restrictedAreaLetter')}
                                        </div>
                                        <Input
                                            id="restrictedAreaLetter"
                                            type="text"
                                            maxLength={1}
                                            value={params.restrictedAreaLetter}
                                            onChange={(e) => onParamChange('restrictedAreaLetter', e.target.value)} // Removed .toUpperCase()
                                            className="w-12 h-8 text-center"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between space-x-2">
                                        <div className="flex items-center">
                                            <Label htmlFor="fontFamily" className="text-sm font-medium">Font Family</Label>
                                            {renderTooltip('fontFamily')}
                                        </div>
                                        <Input
                                            id="fontFamily"
                                            type="text"
                                            value={params.fontFamily}
                                            onChange={(e) => onParamChange('fontFamily', e.target.value)}
                                            className="w-32 h-8 text-sm"
                                        />
                                    </div>
                                </>
                            )}
                            {renderSlider('restrictedAreaSize', 'Size', 50, 500, 10)}
                            {renderSlider('restrictedAreaMargin', 'Margin', 0, 50, 1)}
                            <div className="text-xs text-muted-foreground">Use arrow keys to move the restricted area. Shift+Arrow for larger steps.</div>
                        </>
                    )}
                </div>

            </CardContent>
        </Card>
    );
}
