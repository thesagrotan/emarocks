import React from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SimulationParams } from "./types";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
                <CardTitle className="text-base">Container</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {renderSlider('containerMargin', 'Margin', 0, 100, 1)}
                {renderSwitch('isRoundedContainer', 'Rounded Container')}
                {renderSwitch('showBorder', 'Show Border')}
            </CardContent>
        </Card>
    );
}
