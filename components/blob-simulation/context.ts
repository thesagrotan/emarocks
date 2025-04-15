import { createContext } from "react"
import type { SimulationParams } from "./types"

export const SimulationParamsContext = createContext<SimulationParams | undefined>(undefined)
