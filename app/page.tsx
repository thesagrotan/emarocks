"use client"
import { BlobSimulation } from "@/components/blob-simulation";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <main className="p-4 min-h-screen w-max max-w-full flex flex-col items-center">
      <div className="w-max max-w-full flex justify-center">
        <BlobSimulation />
      </div>

      <ThemeToggle />
    </main>
  );
}
