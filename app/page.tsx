"use client"
import { BlobSimulation } from "@/components/blob-simulation";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    // Main container can be simpler now, just providing basic structure
    // Removed padding, items-center, justify-center as BlobSimulation handles its internal layout
    <main className="min-h-screen w-full">
      {/* BlobSimulation now manages its own fixed/centered layout */}
      <BlobSimulation />

      {/* Position ThemeToggle fixed at bottom center */}
      {/* Removed right-4, added left-1/2 and -translate-x-1/2 */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20"> 
        <ThemeToggle />
      </div>
    </main>
  );
}
