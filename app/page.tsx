"use client"
import { BlobSimulation } from "@/components/blob-simulation"
import { ThemeToggle } from "@/components/theme-toggle"

export default function Home() {
  return (
    <main className="p-4 min-h-screen flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-4 text-center">Soft Blob Physics Simulation</h1>

      <div className="w-full max-w-[800px] flex justify-center">
        <BlobSimulation />
      </div>

      <ThemeToggle />
    </main>
  )
}
