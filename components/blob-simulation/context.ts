import { createContext } from "react"
import type { SimulationParamsContextType } from "./types" // Import the correct type

// Use SimulationParamsContextType for the context
export const SimulationParamsContext = createContext<SimulationParamsContextType | undefined>(undefined)
