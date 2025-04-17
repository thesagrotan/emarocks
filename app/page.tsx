"use client"
// Assuming BlobSimulation is exported from index.ts or index.tsx within the directory
import { BlobSimulation } from "@/components/blob-simulation";
import { ThemeToggle } from "@/components/ui/ThemeToggle"; // Import the new component

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-between p-4 md:p-8 lg:p-12 relative">
      {/* Add ThemeToggle to the top-right corner */}
      <div className="fixed bottom-4 left-20 z-50">
        <ThemeToggle />
      </div>

      {/* Full-width container for the simulation and controls */}
      <div className="w-full max-w-7xl flex-grow flex flex-col md:flex-row gap-6">
        {/* Simulation takes up most space */}
        <div className="flex-grow flex items-center justify-center">
          <BlobSimulation />
        </div>
      </div>

      {/* Optional: Footer or other elements */}
      <footer className="w-full mt-8 text-center text-xs text-muted-foreground">
        {/* Footer content */}
      </footer>
    </main>
  );
}
