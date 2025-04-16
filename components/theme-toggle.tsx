"use client"

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { getSimulationColors } from "@/shared/utils";
import { SimulationParams } from "@/components/blob-simulation/types";

interface ThemeToggleProps {
  bgColorLight?: string;
  bgColorDark?: string;
  iconColorLight?: string;
  iconColorDark?: string;
}

export function ThemeToggle({ 
  bgColorLight = "#D3D3D3",
  bgColorDark = "#333333",
  iconColorLight = "#000000",
  iconColorDark = "#FFFFFF"
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Create minimal params object with just the theme toggle colors
  const themeParams: Partial<SimulationParams> = {
    themeToggleBgColorLight: bgColorLight,
    themeToggleBgColorDark: bgColorDark,
    themeToggleIconColorLight: iconColorLight,
    themeToggleIconColorDark: iconColorDark,
  };
  
  // Get theme-appropriate colors from the central utility
  const colors = getSimulationColors(themeParams as SimulationParams, theme || 'light');
  
  // Use the colors returned from the utility
  const buttonBg = colors.themeToggleBg;
  const iconColor = colors.themeToggleIcon;
  const iconTranslateX = theme === "dark" ? "27px" : "4px";

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <button
      onClick={toggleTheme}
      className="relative rounded-[15px] w-[50px] h-[30px] border-none cursor-pointer p-0 overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ backgroundColor: buttonBg }}
      aria-label="Toggle dark mode"
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 30 30"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute top-[3.5px] left-[4px] transition-transform duration-150 ease-in"
      >
        <circle 
          cx="11.5" 
          cy="11.5" 
          r="11.5" 
          fill={iconColor} 
          style={{ transform: `translateX(${iconTranslateX})`}} 
        />
      </svg>
    </button>
  );
}
