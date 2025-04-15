import { useContext } from "react"
import { SimulationParamsContext } from "./context"

export function useSimulationParams() {
  const ctx = useContext(SimulationParamsContext)
  if (!ctx) throw new Error("useSimulationParams must be used within SimulationParamsContext.Provider")
  return ctx
}
