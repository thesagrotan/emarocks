"use client"

import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SimulationParams } from "./types"
import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import React, { useEffect, useState } from "react"

interface SimulationControlsProps {
  params: SimulationParams
  onParamChange: (key: string, value: any) => void
  onRestart: () => void
  isAnimating?: boolean
}

export function SimulationControls({ 
  params, 
  onParamChange, 
  onRestart,
  isAnimating = false
}: SimulationControlsProps) {
  // Helper to determine if a parameter requires restart
  const requiresRestart = (param: keyof SimulationParams): boolean => {
    return ['shapeCount', 'edgePointCount', 'minBlobSize'].includes(param as string);
  };

  // Custom Label component with restart indicator and info tooltip
  const ParamLabel = ({ 
    htmlFor, 
    param,
    children,
    info
  }: { 
    htmlFor: string, 
    param: keyof SimulationParams,
    children: React.ReactNode,
    info: string
  }) => {
    const needsRestart = requiresRestart(param);
    
    return (
      <div className="flex items-center gap-2">
        <Label htmlFor={htmlFor} className="text-xs font-medium">
          {children}
        </Label>
        {needsRestart && isAnimating && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-amber-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Requires restart to take effect</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{info}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  };

  // Font Access API logic (now uses static JSON)
  const [systemFonts, setSystemFonts] = useState<string[]>([]);
  const [fontsLoading, setFontsLoading] = useState(false);

  return (
    <Card className="w-full max-w-[320px] h-[500px] overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* Restart Button */}
        <Button
          variant="outline"
          onClick={onRestart}
          className="w-full"
        >
          Restart Simulation
        </Button>

        {/* Shape Settings */}
        <div className="space-y-3">
          <div className="space-y-1">
            <ParamLabel 
              htmlFor="shapeCount" 
              param="shapeCount"
              info="The number of blob shapes to generate in the simulation"
            >
              Shape Count ({params.shapeCount})
            </ParamLabel>
            <Slider 
              id="shapeCount" 
              min={1} 
              max={500} 
              step={1} 
              value={[params.shapeCount]} 
              onValueChange={(val) => onParamChange('shapeCount', val[0])}
            />
          </div>
          <div className="space-y-1">
            <ParamLabel 
              htmlFor="edgePointCount" 
              param="edgePointCount"
              info="The number of points that define the edge of each blob"
            >
              Edge Points ({params.edgePointCount})
            </ParamLabel>
            <Slider 
              id="edgePointCount" 
              min={3} 
              max={32} 
              step={1} 
              value={[params.edgePointCount]} 
              onValueChange={(val) => onParamChange('edgePointCount', val[0])}
            />
          </div>
          <div className="space-y-1">
            <ParamLabel 
              htmlFor="minBlobSize" 
              param="minBlobSize"
              info="The minimum size of each blob"
            >
              Min Size ({params.minBlobSize})
            </ParamLabel>
            <Slider 
              id="minBlobSize" 
              min={2} 
              max={20} 
              step={1} 
              value={[params.minBlobSize]} 
              onValueChange={(val) => onParamChange('minBlobSize', val[0])}
            />
          </div>
        </div>

        {/* Physics Settings */}
        <div className="space-y-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <div className="space-y-1">
            <ParamLabel 
              htmlFor="repelDistance" 
              param="repelDistance"
              info="How far blobs repel each other when they get too close"
            >
              Repel Distance ({params.repelDistance})
            </ParamLabel>
            <Slider 
              id="repelDistance" 
              min={0} 
              max={10} 
              step={0.1} 
              value={[params.repelDistance]} 
              onValueChange={(val) => onParamChange('repelDistance', val[0])}
            />
          </div>
          <div className="space-y-1">
            <ParamLabel 
              htmlFor="springTension" 
              param="springTension"
              info="How strongly the blob points are pulled back to their original positions"
            >
              Spring Tension ({params.springTension})
            </ParamLabel>
            <Slider 
              id="springTension" 
              min={0} 
              max={1} 
              step={0.05} 
              value={[params.springTension]} 
              onValueChange={(val) => onParamChange('springTension', val[0])}
            />
          </div>
          <div className="space-y-1">
            <ParamLabel 
              htmlFor="interactionStrength" 
              param="interactionStrength"
              info="How strongly blobs interact with each other"
            >
              Interaction ({params.interactionStrength})
            </ParamLabel>
            <Slider 
              id="interactionStrength" 
              min={0} 
              max={0.2} 
              step={0.01} 
              value={[params.interactionStrength]} 
              onValueChange={(val) => onParamChange('interactionStrength', val[0])}
            />
          </div>
          <div className="space-y-1">
            <ParamLabel 
              htmlFor="damping" 
              param="damping"
              info="How quickly blob movement slows down"
            >
              Damping ({params.damping})
            </ParamLabel>
            <Slider 
              id="damping" 
              min={0} 
              max={1} 
              step={0.05} 
              value={[params.damping]} 
              onValueChange={(val) => onParamChange('damping', val[0])}
            />
          </div>
          <div className="space-y-1">
            <ParamLabel 
              htmlFor="speed" 
              param="speed"
              info="Overall animation speed"
            >
              Speed ({params.speed})
            </ParamLabel>
            <Slider 
              id="speed" 
              min={0} 
              max={2} 
              step={0.1} 
              value={[params.speed]} 
              onValueChange={(val) => onParamChange('speed', val[0])}
            />
          </div>
          <div className="space-y-1">
            <ParamLabel 
              htmlFor="maxExpansionFactor" 
              param="maxExpansionFactor"
              info="How much blobs can expand beyond their initial size"
            >
              Max Expansion ({params.maxExpansionFactor.toFixed(1)})
            </ParamLabel>
            <Slider 
              id="maxExpansionFactor" 
              min={1} 
              max={8} 
              step={0.1} 
              value={[params.maxExpansionFactor]} 
              onValueChange={(val) => onParamChange('maxExpansionFactor', val[0])}
            />
          </div>
        </div>

        {/* Container Settings */}
        <div className="space-y-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <ParamLabel 
              htmlFor="container-rounded" 
              param="isRoundedContainer"
              info="Makes the container circular instead of rectangular"
            >
              Rounded Container
            </ParamLabel>
            <Switch 
              id="container-rounded"
              checked={params.isRoundedContainer}
              onCheckedChange={(checked) => onParamChange('isRoundedContainer', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <ParamLabel 
              htmlFor="show-border" 
              param="showBorder"
              info="Shows or hides the container border"
            >
              Show Border
            </ParamLabel>
            <Switch 
              id="show-border"
              checked={params.showBorder}
              onCheckedChange={(checked) => onParamChange('showBorder', checked)}
            />
          </div>
        </div>

        {/* Restricted Area Settings */}
        <div className="space-y-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <ParamLabel 
              htmlFor="restricted-area" 
              param="restrictedAreaEnabled"
              info="Creates a letter-shaped area that blobs avoid"
            >
              Restricted Area
            </ParamLabel>
            <Switch 
              id="restricted-area"
              checked={params.restrictedAreaEnabled}
              onCheckedChange={(checked) => onParamChange('restrictedAreaEnabled', checked)}
            />
          </div>
          {params.restrictedAreaEnabled && (
            <>
              <div className="flex items-center justify-between">
                <ParamLabel 
                  htmlFor="restrictedAreaLetter" 
                  param="restrictedAreaLetter"
                  info="The letter that defines the restricted area"
                >
                  Letter
                </ParamLabel>
                <input 
                  type="text" 
                  id="restrictedAreaLetter" 
                  value={params.restrictedAreaLetter} 
                  onChange={(e) => onParamChange('restrictedAreaLetter', e.target.value.charAt(0))} 
                  maxLength={1}
                  className="w-16 text-center border rounded bg-transparent dark:border-neutral-700 px-1 text-sm"
                />
              </div>
              <div className="space-y-1">
                <ParamLabel 
                  htmlFor="restrictedAreaSize" 
                  param="restrictedAreaSize"
                  info="The size of the letter in the restricted area"
                >
                  Letter Size ({params.restrictedAreaSize})
                </ParamLabel>
                <Slider 
                  id="restrictedAreaSize" 
                  min={10} 
                  max={800} 
                  step={1} 
                  value={[params.restrictedAreaSize]} 
                  onValueChange={(val) => onParamChange('restrictedAreaSize', val[0])} 
                />
              </div>
              {/* Font Family Input */}
              <div className="space-y-1">
                <ParamLabel
                  htmlFor="fontFamily"
                  param="fontFamily"
                  info="Font family for the letter (type the name of any installed font)"
                >
                  Letter Font
                </ParamLabel>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    id="fontFamily"
                    value={params.fontFamily || ''}
                    onChange={(e) => onParamChange('fontFamily', e.target.value)}
                    className="w-full border rounded bg-transparent dark:border-neutral-700 px-1 text-sm"
                    placeholder="e.g. Arial, Fira Code, SF Pro Display"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Color Settings */}
        <Tabs defaultValue="light-mode" className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="light-mode">Light</TabsTrigger>
            <TabsTrigger value="dark-mode">Dark</TabsTrigger>
          </TabsList>
          <TabsContent value="light-mode" className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="bg-color" className="text-xs">Background</Label>
              <input 
                type="color" 
                id="bg-color" 
                value={params.backgroundColor} 
                onChange={(e) => onParamChange('backgroundColor', e.target.value)} 
                className="w-6 h-6 rounded cursor-pointer border dark:border-neutral-700"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="blob-fill" className="text-xs">Blob Fill</Label>
              <input 
                type="color" 
                id="blob-fill" 
                value={params.blobFillColor} 
                onChange={(e) => onParamChange('blobFillColor', e.target.value)} 
                className="w-6 h-6 rounded cursor-pointer border dark:border-neutral-700"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="blob-border" className="text-xs">Blob Border</Label>
              <input 
                type="color" 
                id="blob-border" 
                value={params.blobBorderColor} 
                onChange={(e) => onParamChange('blobBorderColor', e.target.value)} 
                className="w-6 h-6 rounded cursor-pointer border dark:border-neutral-700"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="letter-color-light" className="text-xs">Letter Color</Label>
              <input 
                type="color" 
                id="letter-color-light" 
                value={params.letterColor || "#000000"} 
                onChange={(e) => onParamChange('letterColor', e.target.value)} 
                className="w-6 h-6 rounded cursor-pointer border dark:border-neutral-700"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="blobFillOpacity" className="text-xs font-medium">Fill Opacity ({params.blobFillOpacity.toFixed(2)})</Label>
              <Slider 
                id="blobFillOpacity" 
                min={0} 
                max={1} 
                step={0.05} 
                value={[params.blobFillOpacity]} 
                onValueChange={(val) => onParamChange('blobFillOpacity', val[0])}
              />
            </div>
          </TabsContent>
          <TabsContent value="dark-mode" className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="dark-bg-color" className="text-xs">Background</Label>
              <input 
                type="color" 
                id="dark-bg-color" 
                value={params.darkBackgroundColor} 
                onChange={(e) => onParamChange('darkBackgroundColor', e.target.value)} 
                className="w-6 h-6 rounded cursor-pointer border dark:border-neutral-700"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="dark-blob-fill" className="text-xs">Blob Fill</Label>
              <input 
                type="color" 
                id="dark-blob-fill" 
                value={params.darkBlobFillColor} 
                onChange={(e) => onParamChange('darkBlobFillColor', e.target.value)} 
                className="w-6 h-6 rounded cursor-pointer border dark:border-neutral-700"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="dark-blob-border" className="text-xs">Blob Border</Label>
              <input 
                type="color" 
                id="dark-blob-border" 
                value={params.darkBlobBorderColor} 
                onChange={(e) => onParamChange('darkBlobBorderColor', e.target.value)} 
                className="w-6 h-6 rounded cursor-pointer border dark:border-neutral-700"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="letter-color-dark" className="text-xs">Letter Color</Label>
              <input 
                type="color" 
                id="letter-color-dark" 
                value={params.darkLetterColor || "#FFFFFF"} 
                onChange={(e) => onParamChange('darkLetterColor', e.target.value)} 
                className="w-6 h-6 rounded cursor-pointer border dark:border-neutral-700"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="darkBlobFillOpacity" className="text-xs font-medium">Fill Opacity ({params.darkBlobFillOpacity.toFixed(2)})</Label>
              <Slider 
                id="darkBlobFillOpacity" 
                min={0} 
                max={1} 
                step={0.05} 
                value={[params.darkBlobFillOpacity]} 
                onValueChange={(val) => onParamChange('darkBlobFillOpacity', val[0])}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
}