import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components

interface ActionControlsProps {
    onRestart: () => void;
    onDownloadSVG: () => void;
    onDownloadSettings: () => void;
    onLoadSettings: (event: React.ChangeEvent<HTMLInputElement>) => void;
    triggerFileInput: () => void;
}

export function ActionControls({
    onRestart,
    onDownloadSVG,
    onDownloadSettings,
    onLoadSettings,
    triggerFileInput
}: ActionControlsProps) {
    return (
        // Wrap in Card
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Actions</CardTitle> {/* Use CardTitle */}
            </CardHeader>
            <CardContent className="space-y-2"> {/* Use CardContent */}
                {/* Removed h3 title */}
                <Button onClick={onRestart} className="w-full">Restart Simulation</Button>
                <Button onClick={onDownloadSVG} variant="outline" className="w-full">Download SVG</Button>
                <Button onClick={onDownloadSettings} variant="outline" className="w-full">Download Settings</Button>
                {/* Hidden file input remains in the parent panel */}
                <Button onClick={triggerFileInput} variant="outline" className="w-full">Load Settings</Button>
            </CardContent>
        </Card>
    );
}
