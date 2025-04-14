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

  // Custom Label component with restart indicator
  const ParamLabel = ({ 
    htmlFor, 
    param,
    children 
  }: { 
    htmlFor: string, 
    param: keyof SimulationParams,
    children: React.ReactNode 
  }) => {
    const needsRestart = requiresRestart(param);
    
    return (
      <div className="flex items-center gap-1">
        <Label htmlFor={htmlFor} className="text-xs font-medium">
          {children}
        </Label>
        {needsRestart && isAnimating && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-amber-500" />
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="text-xs">Requires restart</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  };
  
  return (
    <Card className="bg-white/80 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 p-4 rounded-lg w-full max-w-[320px] flex-shrink-0 shadow-md backdrop-blur-sm">
      <div className="space-y-4">
        <h3 className="font-semibold text-lg text-center mb-4">Blob Controls</h3>

        {/* Simulation Parameters */}
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-1">
            <ParamLabel htmlFor="shapeCount" param="shapeCount">
              Shape Count ({params.shapeCount})
            </ParamLabel>
            <Slider 
              id="shapeCount" 
              min={1} 
              max={100} 
              step={1} 
              value={[params.shapeCount]} 
              onValueChange={(val) => onParamChange('shapeCount', val[0])} 
            />
          </div>
          <div className="space-y-1">
            <ParamLabel htmlFor="edgePointCount" param="edgePointCount">
              Edge Points ({params.edgePointCount})
            </ParamLabel>
            <Slider 
              id="edgePointCount" 
              min={5} 
              max={50} 
              step={1} 
              value={[params.edgePointCount]} 
              onValueChange={(val) => onParamChange('edgePointCount', val[0])} 
            />
          </div>
          <div className="space-y-1">
            <ParamLabel htmlFor="minBlobSize" param="minBlobSize">
              Min Size ({params.minBlobSize})
            </ParamLabel>
            <Slider 
              id="minBlobSize" 
              min={5} 
              max={30} 
              step={1} 
              value={[params.minBlobSize]} 
              onValueChange={(val) => onParamChange('minBlobSize', val[0])} 
            />
          </div>
          <div className="space-y-1">
            <ParamLabel htmlFor="repelDistance" param="repelDistance">
              Repel Dist ({params.repelDistance})
            </ParamLabel>
            <Slider 
              id="repelDistance" 
              min={1} 
              max={50} 
              step={1} 
              value={[params.repelDistance]} 
              onValueChange={(val) => onParamChange('repelDistance', val[0])} 
            />
          </div>
          <div className="space-y-1">
            <ParamLabel htmlFor="springTension" param="springTension">
              Tension ({params.springTension.toFixed(2)})
            </ParamLabel>
            <Slider 
              id="springTension" 
              min={0.01} 
              max={1} 
              step={0.01} 
              value={[params.springTension]} 
              onValueChange={(val) => onParamChange('springTension', val[0])} 
            />
          </div>
          <div className="space-y-1">
            <ParamLabel htmlFor="interactionStrength" param="interactionStrength">
              Interaction ({params.interactionStrength.toFixed(3)})
            </ParamLabel>
            <Slider 
              id="interactionStrength" 
              min={0.001} 
              max={0.05} 
              step={0.001} 
              value={[params.interactionStrength]} 
              onValueChange={(val) => onParamChange('interactionStrength', val[0])} 
            />
          </div>
          <div className="space-y-1">
            <ParamLabel htmlFor="gravity" param="gravity">
              Gravity ({params.gravity.toFixed(2)})
            </ParamLabel>
            <Slider 
              id="gravity" 
              min={-0.5} 
              max={0.5} 
              step={0.01} 
              value={[params.gravity]} 
              onValueChange={(val) => onParamChange('gravity', val[0])} 
            />
          </div>
          <div className="space-y-1">
            <ParamLabel htmlFor="damping" param="damping">
              Damping ({params.damping.toFixed(3)})
            </ParamLabel>
            <Slider 
              id="damping" 
              min={0.9} 
              max={0.999} 
              step={0.001} 
              value={[params.damping]} 
              onValueChange={(val) => onParamChange('damping', val[0])} 
            />
          </div>
          <div className="space-y-1">
            <ParamLabel htmlFor="maxExpansionFactor" param="maxExpansionFactor">
              Max Expand ({params.maxExpansionFactor.toFixed(1)}x)
            </ParamLabel>
            <Slider 
              id="maxExpansionFactor" 
              min={1} 
              max={5} 
              step={0.1} 
              value={[params.maxExpansionFactor]} 
              onValueChange={(val) => onParamChange('maxExpansionFactor', val[0])} 
            />
          </div>
          {/* Speed parameter - new addition */}
          <div className="space-y-1">
            <ParamLabel htmlFor="speed" param="speed">
              Speed ({params.speed.toFixed(1)}x)
            </ParamLabel>
            <Slider 
              id="speed" 
              min={0.1} 
              max={3} 
              step={0.1} 
              value={[params.speed]} 
              onValueChange={(val) => onParamChange('speed', val[0])} 
            />
          </div>
        </div>

        {/* Container/Appearance Settings */}
        <div className="space-y-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <ParamLabel htmlFor="containerMargin" param="containerMargin">
              Container Margin
            </ParamLabel>
            <input 
              type="number" 
              id="containerMargin" 
              min={0} 
              max={100} 
              value={params.containerMargin} 
              onChange={(e) => onParamChange('containerMargin', Math.max(0, +e.target.value))} 
              className="w-16 text-center border rounded bg-transparent dark:border-neutral-700 px-1 text-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <ParamLabel htmlFor="show-border" param="showBorder">
              Show Border
            </ParamLabel>
            <Switch 
              id="show-border" 
              checked={params.showBorder} 
              onCheckedChange={(val) => onParamChange('showBorder', val)} 
            />
          </div>
          <div className="flex items-center justify-between">
            <ParamLabel htmlFor="rounded-container" param="isRoundedContainer">
              Rounded Container
            </ParamLabel>
            <Switch 
              id="rounded-container" 
              checked={params.isRoundedContainer} 
              onCheckedChange={(val) => onParamChange('isRoundedContainer', val)} 
            />
          </div>
        </div>

        {/* Restricted Area Settings */}
        <div className="space-y-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <ParamLabel htmlFor="restricted-area-enable" param="restrictedAreaEnabled">
              Enable Obstacle
            </ParamLabel>
            <Switch 
              id="restricted-area-enable" 
              checked={params.restrictedAreaEnabled} 
              onCheckedChange={(val) => onParamChange('restrictedAreaEnabled', val)} 
            />
          </div>
          {params.restrictedAreaEnabled && (
            <>
              <div className="flex items-center justify-between">
                <Label htmlFor="restrictedAreaLetter" className="text-xs font-medium">Letter</Label>
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
                <ParamLabel htmlFor="restrictedAreaSize" param="restrictedAreaSize">
                  Letter Size ({params.restrictedAreaSize})
                </ParamLabel>
                <Slider 
                  id="restrictedAreaSize" 
                  min={10} 
                  max={400} 
                  step={1} 
                  value={[params.restrictedAreaSize]} 
                  onValueChange={(val) => onParamChange('restrictedAreaSize', val[0])} 
                />
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

        {/* Restart Button */}
        <Button 
          onClick={onRestart} 
          className="w-full mt-4" 
          variant={isAnimating ? "destructive" : "default"}
        >
          Restart Simulation
        </Button>
        
        {isAnimating && (
          <p className="text-xs text-center text-muted-foreground mt-2">
            Parameters with <Info className="h-3 w-3 text-amber-500 inline-block" /> require a restart to apply changes.
          </p>
        )}
      </div>
    </Card>
  )
}