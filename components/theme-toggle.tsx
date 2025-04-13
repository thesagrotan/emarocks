"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-4 right-4 bg-[rgba(108,140,147,0.5)] rounded-[15px] w-[53px] h-[29px] border-none cursor-pointer p-0 overflow-hidden focus-visible:outline-2 focus-visible:outline-current focus-visible:outline-offset-2"
      aria-label="Toggle dark mode"
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 53 29"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute top-0 left-0 transition-transform duration-150 ease-in"
      >
        <circle
          className={`fill-[#04050c] dark:fill-[#f6fefa] transform transition-transform duration-150 ease-in ${theme === "dark" ? "translate-x-[25px]" : "translate-x-0"}`}
          cx="14"
          cy="15"
          r="11.5"
        />
        <path
          className={`fill-white transition-transform duration-150 ease-in origin-[38.5px_14.5px] ${theme === "dark" ? "scale-100" : "scale-[0.92]"}`}
          d="M43.9941 15c0 2.7614-2.2385 5-5 5-2.7614 0-5-2.2386-5-5s2.2386-5 5-5c2.7615 0 5 2.2386 5 5Z"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          className={`fill-white transition-transform duration-150 ease-in origin-[14.5px_14.5px] ${theme === "dark" ? "scale-[0.92]" : "scale-100"}`}
          d="M10.2474 18.695c4.1132 0 7.4476-3.3344 7.4476-7.4476 0-1.92311-.7289-3.67597-1.9255-4.9974 3.5676 1.01367 6.1804 4.2959 6.1804 8.1884 0 4.7008-3.8107 8.5115-8.5115 8.5115-3.89251 0-7.17473-2.6128-8.1884-6.1804 1.32143 1.1966 3.07429 1.9255 4.9974 1.9255Z"
        />
      </svg>
    </button>
  )
}
