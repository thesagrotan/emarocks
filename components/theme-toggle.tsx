"use client"

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface ThemeToggleProps {
  
}

export function ThemeToggle({ }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const buttonBg = theme === "dark" ? "#333333" : "#D3D3D3";
  const iconColor = theme === "dark" ? "#FFFFFF" : "#000000";
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
      className={`relative bg-[${buttonBg}] rounded-[15px] w-[50px] h-[30px] border-none cursor-pointer p-0 overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2`}
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
