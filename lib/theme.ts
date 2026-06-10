import type { CSSProperties } from "react";
import type { ProductTheme } from "@/types";

export const DEFAULT_PRODUCT_THEME: ProductTheme = {
  primary: "16 185 129",
  primaryHover: "5 150 105",
  primaryForeground: "255 255 255",
  soft: "236 253 245",
  softDark: "2 44 34",
  softForeground: "5 150 105",
  softForegroundDark: "52 211 153",
  border: "167 243 208",
  borderDark: "6 78 59",
};

export const APP_THEMES = {
  main: {
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
  legal: {
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

export function themeStyle(theme: AppThemeName | ProductTheme | undefined): CSSProperties {
  const palette = typeof theme === "string" ? APP_THEMES[theme] : theme ?? DEFAULT_PRODUCT_THEME;
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
