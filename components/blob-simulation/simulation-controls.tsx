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
import { ThemeToggle } from "../theme-toggle"

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

  // Short descriptions for each setting
  const paramDescriptions: Record<string, string> = {
    shapeCount: "Total number of blobs generated and animated in the simulation.",
    edgePointCount: "Number of points used to define the outline of each blob. Higher values make blobs smoother.",
    minBlobSize: "Minimum radius for each blob. Controls the smallest possible blob size.",
    repelDistance: "Distance at which blobs start to push each other away to avoid overlap.",
    springTension: "How strongly each blob's edge points are pulled back to their original positions, affecting blob elasticity.",
    interactionStrength: "Controls how much blobs influence each other's movement when they get close.",
    damping: "Rate at which blob movement slows down, simulating friction or resistance.",
    speed: "Multiplier for the simulation's animation speed. Higher values make blobs move faster.",
    maxExpansionFactor: "Maximum amount a blob can expand beyond its initial size when interacting with others.",
    isRoundedContainer: "If enabled, the simulation area is a circle instead of a rectangle.",
    showBorder: "Show or hide the border around the simulation container.",
    restrictedAreaEnabled: "Enable a special area (in the shape of a letter) that blobs will avoid.",
    restrictedAreaLetter: "The character used to define the restricted area that blobs avoid.",
    restrictedAreaSize: "The size (in pixels) of the restricted area letter.",
    fontFamily: "Font family used to render the restricted area letter. Enter the name of any installed font.",
    backgroundColor: "Background color for the simulation in light mode.",
    blobFillColor: "Fill color for blobs in light mode.",
    blobBorderColor: "Border color for blobs in light mode.",
    letterColor: "Color of the restricted area letter in light mode.",
    blobFillOpacity: "Opacity of the blob fill color in light mode. Lower values make blobs more transparent.",
    darkBackgroundColor: "Background color for the simulation in dark mode.",
    darkBlobFillColor: "Fill color for blobs in dark mode.",
    darkBlobBorderColor: "Border color for blobs in dark mode.",
    darkLetterColor: "Color of the restricted area letter in dark mode.",
    darkBlobFillOpacity: "Opacity of the blob fill color in dark mode. Lower values make blobs more transparent."
  };

  // Custom Label component with restart indicator and info tooltip
  const ParamLabel = ({ 
    htmlFor, 
    param,
    children,
    info
  }: { 
    htmlFor: string, 
    param: keyof SimulationParams | string,
    children: React.ReactNode,
    info?: string
  }) => {
    const needsRestart = requiresRestart(param as keyof SimulationParams);
    const description = paramDescriptions[param as string] || info || "";
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
              <p className="text-xs">{description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  };

  // Font Access API logic (now uses static JSON)
  const [systemFonts, setSystemFonts] = useState<string[]>([]);
  const [fontsLoading, setFontsLoading] = useState(false);

  // Download settings as Markdown file
  const handleDownloadSettings = () => {
    const md = [
      "# Blob Simulation Settings",
      "",
      "```json",
      JSON.stringify(params, null, 2),
      "```",
      ""
    ].join("\n");
    const blob = new window.Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "blob-simulation-settings.md";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Load settings from Markdown file
  const handleLoadSettings = async () => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".md,text/markdown";
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const text = await file.text();
        // Extract JSON code block
        const match = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (!match) {
          alert("No JSON code block found in file.");
          return;
        }
        try {
          const parsed = JSON.parse(match[1]);
          // Update all params
          Object.entries(parsed).forEach(([key, value]) => {
            onParamChange(key, value);
          });
        } catch (err) {
          alert("Failed to parse JSON from file.");
        }
      };
      input.click();
    } catch (err) {
      alert("Failed to load settings file.");
    }
  };

  return (
    <Card className="w-full max-w-full max-h-screen overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* Theme Toggle Button */}
        <ThemeToggle
          bgColorLight={params.themeToggleBgColorLight}
          bgColorDark={params.themeToggleBgColorDark}
          iconColorLight={params.themeToggleIconColorLight}
          iconColorDark={params.themeToggleIconColorDark}
        />


        {/* Restart Button */}
        <Button
          variant="outline"
          onClick={onRestart}
          className="w-full"
        >
          Restart Simulation
        </Button>
        {/* Download/Load Settings Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadSettings}
            className="w-full"
          >
            Download
          </Button>
          <Button
            variant="outline"
            onClick={handleLoadSettings}
            className="w-full"
          >
            Load
          </Button>
        </div>
        {/* Shape Settings */}
        <div className="space-y-3">
          <div className="space-y-1">
            <ParamLabel 
              htmlFor="shapeCount" 
              param="shapeCount"
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
          <div className="space-y-1">
            <ParamLabel 
              htmlFor="maxExpansionFactor" 
              param="maxExpansionFactor"
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

        {/* Physics Settings */}
        <div className="space-y-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <div className="space-y-1">
            <ParamLabel 
              htmlFor="repelDistance" 
              param="repelDistance"
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
            >
              Speed ({params.speed})
            </ParamLabel> 
            <Slider 
              id="speed" 
              min={0} 
              max={10} 
              step={0.1} 
              value={[params.speed]} 
              onValueChange={(val) => onParamChange('speed', val[0])}
            />
          </div>
        </div>

        {/* Container Settings */}
        <div className="space-y-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <ParamLabel 
              htmlFor="container-rounded" 
              param="isRoundedContainer"
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
                >
                  Letter Font
                </ParamLabel>                
                <select
                  id="fontFamily"
                  value={params.fontFamily || ''}
                  onChange={(e) => onParamChange('fontFamily', e.target.value)}
                  className="w-full border rounded bg-transparent dark:border-neutral-700 px-1 text-sm"
                >
                  {systemFonts.map((font) => (<option key={font} value={font}>{font}</option>))}
                  {systemFonts.length === 0 && (<option value="">Default</option>)}
                </select>
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
              <ParamLabel htmlFor="bg-color" param="backgroundColor">
                Background
              </ParamLabel>
              <input 
                type="color" 
                id="bg-color" 
                value={params.backgroundColor} 
                onChange={(e) => onParamChange('backgroundColor', e.target.value)} 
                className="w-6 h-6 rounded cursor-pointer border dark:border-neutral-700"
              />
            </div>
            <div className="flex items-center justify-between">
              <ParamLabel htmlFor="blob-fill" param="blobFillColor">
                Blob Fill
              </ParamLabel>
              <input 
                type="color" 
                id="blob-fill" 
                value={params.blobFillColor} 
                onChange={(e) => onParamChange('blobFillColor', e.target.value)} 
                className="w-6 h-6 rounded cursor-pointer border dark:border-neutral-700"
              />
            </div>
            <div className="flex items-center justify-between">
              <ParamLabel htmlFor="blob-border" param="blobBorderColor">
                Blob Border
              </ParamLabel>
              <input 
                type="color" 
                id="blob-border" 
                value={params.blobBorderColor} 
                onChange={(e) => onParamChange('blobBorderColor', e.target.value)} 
                className="w-6 h-6 rounded cursor-pointer border dark:border-neutral-700"
              />
            </div>
            <div className="flex items-center justify-between">
              <ParamLabel htmlFor="letter-color-light" param="letterColor">
                Letter Color
              </ParamLabel>
              <input 
                type="color" 
                id="letter-color-light" 
                value={params.letterColor || "#000000"} 
                onChange={(e) => onParamChange('letterColor', e.target.value)} 
                className="w-6 h-6 rounded cursor-pointer border dark:border-neutral-700"
              />
            </div>
            <div className="space-y-1">
              <ParamLabel htmlFor="blobFillOpacity" param="blobFillOpacity">
                Fill Opacity ({params.blobFillOpacity.toFixed(2)})
              </ParamLabel>
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
              <ParamLabel htmlFor="dark-bg-color" param="darkBackgroundColor">
                Background
              </ParamLabel>
              <input 
                type="color" 
                id="dark-bg-color" 
                value={params.darkBackgroundColor} 
                onChange={(e) => onParamChange('darkBackgroundColor', e.target.value)} 
                className="w-6 h-6 rounded cursor-pointer border dark:border-neutral-700"
              />
            </div>
            <div className="flex items-center justify-between">
              <ParamLabel htmlFor="dark-blob-fill" param="darkBlobFillColor">
                Blob Fill
              </ParamLabel>
              <input 
                type="color" 
                id="dark-blob-fill" 
                value={params.darkBlobFillColor} 
                onChange={(e) => onParamChange('darkBlobFillColor', e.target.value)} 
                className="w-6 h-6 rounded cursor-pointer border dark:border-neutral-700"
              />
            </div>
            <div className="flex items-center justify-between">
              <ParamLabel htmlFor="dark-blob-border" param="darkBlobBorderColor">
                Blob Border
              </ParamLabel>
              <input 
                type="color" 
                id="dark-blob-border" 
                value={params.darkBlobBorderColor} 
                onChange={(e) => onParamChange('darkBlobBorderColor', e.target.value)} 
                className="w-6 h-6 rounded cursor-pointer border dark:border-neutral-700"
              />
            </div>
            <div className="flex items-center justify-between">
              <ParamLabel htmlFor="letter-color-dark" param="darkLetterColor">
                Letter Color
              </ParamLabel>
              <input 
                type="color" 
                id="letter-color-dark" 
                value={params.darkLetterColor || "#FFFFFF"} 
                onChange={(e) => onParamChange('darkLetterColor', e.target.value)} 
                className="w-6 h-6 rounded cursor-pointer border dark:border-neutral-700"
              />
            </div>
            <div className="space-y-1">
              <ParamLabel htmlFor="darkBlobFillOpacity" param="darkBlobFillOpacity">
                Fill Opacity ({params.darkBlobFillOpacity.toFixed(2)})
              </ParamLabel>
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