"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("bout-theme");
    if (stored === "light") {
      setLight(true);
      document.documentElement.classList.add("light");
    }
  }, []);

  const toggle = () => {
    const next = !light;
    setLight(next);
    if (next) {
      document.documentElement.classList.add("light");
      localStorage.setItem("bout-theme", "light");
    } else {
      document.documentElement.classList.remove("light");
      localStorage.setItem("bout-theme", "dark");
    }
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-text-mid hover:text-cyan transition-colors border border-border rounded px-3 py-1.5 hover:border-cyan/30 bg-surface"
      aria-label="Toggle theme"
    >
      <span className="w-3.5 h-3.5 flex items-center justify-center">
        {light ? (
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M8 1a.5.5 0 01.5.5v1a.5.5 0 01-1 0v-1A.5.5 0 018 1zm0 11a.5.5 0 01.5.5v1a.5.5 0 01-1 0v-1A.5.5 0 018 12zm7-4a.5.5 0 01-.5.5h-1a.5.5 0 010-1h1A.5.5 0 0115 8zM4 8a.5.5 0 01-.5.5h-1a.5.5 0 010-1h1A.5.5 0 014 8zm8.95-3.54a.5.5 0 010 .71l-.71.7a.5.5 0 11-.7-.7l.7-.71a.5.5 0 01.71 0zM5.17 10.46a.5.5 0 010 .71l-.71.71a.5.5 0 01-.71-.71l.71-.71a.5.5 0 01.71 0zm7.07 1.42a.5.5 0 01-.71 0l-.71-.71a.5.5 0 01.71-.71l.71.71a.5.5 0 010 .71zM4.46 5.17a.5.5 0 01-.71 0l-.7-.71a.5.5 0 01.7-.71l.71.71a.5.5 0 010 .7zM8 4.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M6 .278a.77.77 0 01.08.858 7.2 7.2 0 00-.878 3.46c0 4.021 3.278 7.277 7.318 7.277q.792-.001 1.533-.16a.79.79 0 01.81.316.73.73 0 01-.031.893A8.35 8.35 0 018.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.75.75 0 016 .278z" />
          </svg>
        )}
      </span>
      {light ? "Light" : "Dark"}
    </button>
  );
}
