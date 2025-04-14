"use client"

import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SimulationParams } from "./types"

interface SimulationControlsProps {
  params: SimulationParams
  onParamChange: (key: keyof SimulationParams, value: any) => void
  onRestart: () => void
}

export function SimulationControls({ 
  params, 
  onParamChange, 
  onRestart 
}: SimulationControlsProps) {
  return (
    <Card className="bg-white/80 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 p-4 rounded-lg w-full max-w-[320px] flex-shrink-0 shadow-md backdrop-blur-sm">
      <div className="space-y-4">
        <h3 className="font-semibold text-lg text-center mb-4">Blob Controls</h3>

        {/* Simulation Parameters */}
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-1">
            <Label htmlFor="shapeCount" className="text-xs font-medium">Shape Count ({params.shapeCount})</Label>
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
            <Label htmlFor="edgePointCount" className="text-xs font-medium">Edge Points ({params.edgePointCount})</Label>
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
            <Label htmlFor="minBlobSize" className="text-xs font-medium">Min Size ({params.minBlobSize})</Label>
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
            <Label htmlFor="repelDistance" className="text-xs font-medium">Repel Dist ({params.repelDistance})</Label>
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
            <Label htmlFor="springTension" className="text-xs font-medium">Tension ({params.springTension.toFixed(2)})</Label>
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
            <Label htmlFor="interactionStrength" className="text-xs font-medium">Interaction ({params.interactionStrength.toFixed(3)})</Label>
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
            <Label htmlFor="gravity" className="text-xs font-medium">Gravity ({params.gravity.toFixed(2)})</Label>
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
            <Label htmlFor="damping" className="text-xs font-medium">Damping ({params.damping.toFixed(3)})</Label>
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
            <Label htmlFor="maxExpansionFactor" className="text-xs font-medium">Max Expand ({params.maxExpansionFactor.toFixed(1)}x)</Label>
            <Slider 
              id="maxExpansionFactor" 
              min={1} 
              max={5} 
              step={0.1} 
              value={[params.maxExpansionFactor]} 
              onValueChange={(val) => onParamChange('maxExpansionFactor', val[0])} 
            />
          </div>
        </div>

        {/* Container/Appearance Settings */}
        <div className="space-y-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <Label htmlFor="containerMargin" className="text-xs font-medium">Container Margin</Label>
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
            <Label htmlFor="show-border" className="text-sm">Show Border</Label>
            <Switch 
              id="show-border" 
              checked={params.showBorder} 
              onCheckedChange={(val) => onParamChange('showBorder', val)} 
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="rounded-container" className="text-sm">Rounded Container</Label>
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
            <Label htmlFor="restricted-area-enable" className="text-sm">Enable Obstacle</Label>
            <Switch 
              id="restricted-area-enable" 
              checked={params.restrictedAreaEnabled} 
              onCheckedChange={(val) => onParamChange('restrictedAreaEnabled', val)} 
            />
          </div>
          {params.restrictedAreaEnabled && (
            <>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Obstacle Shape</Label>
                <select 
                  value={params.restrictedAreaShape} 
                  onChange={(e) => onParamChange('restrictedAreaShape', e.target.value)} 
                  className="text-xs border rounded bg-transparent dark:border-neutral-700 px-1 py-0.5"
                >
                  <option value="rectangle">Rectangle</option>
                  <option value="letter">Letter</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="restrictedAreaSize" className="text-xs font-medium">Obstacle Size ({params.restrictedAreaSize})</Label>
                <Slider 
                  id="restrictedAreaSize" 
                  min={20} 
                  max={200} 
                  step={5} 
                  value={[params.restrictedAreaSize]} 
                  onValueChange={(val) => onParamChange('restrictedAreaSize', val[0])} 
                />
              </div>
              {params.restrictedAreaShape === 'letter' && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="restrictedAreaLetter" className="text-xs font-medium">Letter</Label>
                  <input 
                    type="text" 
                    id="restrictedAreaLetter" 
                    maxLength={1} 
                    value={params.restrictedAreaLetter} 
                    onChange={(e) => onParamChange('restrictedAreaLetter', e.target.value.toUpperCase() || 'A')} 
                    className="w-10 text-center border rounded bg-transparent dark:border-neutral-700 px-1 text-sm uppercase"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Color Settings */}
        <Tabs defaultValue="light-mode" className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <TabsList className="grid w-full grid-cols-2 mb-3">
            <TabsTrigger value="light-mode">Light Colors</TabsTrigger>
            <TabsTrigger value="dark-mode">Dark Colors</TabsTrigger>
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
        <Button onClick={onRestart} className="w-full mt-4">Restart Simulation</Button>
      </div>
    </Card>
  )
}