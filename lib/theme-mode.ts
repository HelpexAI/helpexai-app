"use client";

import { useEffect, useState } from "react";

export const THEME_STORAGE_KEY = "helpex-theme";
const THEME_CHANGE_EVENT = "helpex-theme-change";

function readDarkMode() {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

function setDocumentDarkMode(nextDark: boolean) {
  document.documentElement.classList.toggle("dark", nextDark);
  localStorage.setItem(THEME_STORAGE_KEY, nextDark ? "dark" : "light");
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function useThemeMode() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const sync = () => setDark(readDarkMode());

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(THEME_CHANGE_EVENT, sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(THEME_CHANGE_EVENT, sync);
    };
  }, []);

  function toggleTheme() {
    setDocumentDarkMode(!readDarkMode());
  }

  return { dark, toggleTheme };
}
