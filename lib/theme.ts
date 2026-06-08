import type { CategorySlug } from "@/types";
import type { CSSProperties } from "react";

export const APP_THEMES = {
  main: {
    primary: "43 127 255",
    primaryHover: "37 99 235",
    primaryForeground: "255 255 255",
    soft: "239 246 255",
    softDark: "23 37 84",
    softForeground: "29 78 216",
    softForegroundDark: "96 165 250",
    border: "191 219 254",
    borderDark: "30 58 138",
  },
  legal: {
    primary: "43 127 255",
    primaryHover: "37 99 235",
    primaryForeground: "255 255 255",
    soft: "239 246 255",
    softDark: "23 37 84",
    softForeground: "29 78 216",
    softForegroundDark: "96 165 250",
    border: "191 219 254",
    borderDark: "30 58 138",
  },
  business: {
    primary: "16 185 129",
    primaryHover: "5 150 105",
    primaryForeground: "255 255 255",
    soft: "236 253 245",
    softDark: "2 44 34",
    softForeground: "5 150 105",
    softForegroundDark: "52 211 153",
    border: "167 243 208",
    borderDark: "6 78 59",
  },
} as const;

export type AppThemeName = keyof typeof APP_THEMES;

export function dashboardTheme(category: CategorySlug): AppThemeName {
  return category === "business" ? "business" : "legal";
}

export function themeStyle(theme: AppThemeName): CSSProperties {
  const palette = APP_THEMES[theme];
  return {
    "--theme-primary": palette.primary,
    "--theme-primary-hover": palette.primaryHover,
    "--theme-primary-foreground": palette.primaryForeground,
    "--theme-soft": palette.soft,
    "--theme-soft-dark": palette.softDark,
    "--theme-soft-foreground": palette.softForeground,
    "--theme-soft-foreground-dark": palette.softForegroundDark,
    "--theme-border": palette.border,
    "--theme-border-dark": palette.borderDark,
  } as CSSProperties;
}

