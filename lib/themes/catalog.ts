import { createServiceClient } from "@/lib/supabase/server";
import type { ThemeOption } from "@/types";
import { cache } from "react";

function normalizeTheme(row: Record<string, unknown>): ThemeOption {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: String(row.description || ""),
    primary: String(row.primary_color || row.primary || "16 185 129"),
    primaryHover: String(row.primary_hover_color || row.primaryHover || "5 150 105"),
    primaryForeground: String(row.primary_foreground_color || row.primaryForeground || "255 255 255"),
    soft: String(row.soft_color || row.soft || "236 253 245"),
    softDark: String(row.soft_dark_color || row.softDark || "2 44 34"),
    softForeground: String(row.soft_foreground_color || row.softForeground || "5 150 105"),
    softForegroundDark: String(row.soft_foreground_dark_color || row.softForegroundDark || "52 211 153"),
    border: String(row.border_color || row.border || "167 243 208"),
    borderDark: String(row.border_dark_color || row.borderDark || "6 78 59"),
    is_active: Boolean(row.is_active),
    sort_order: Number(row.sort_order ?? 0),
  };
}

export const getActiveThemes = cache(async (): Promise<ThemeOption[]> => {
  const { data, error } = await createServiceClient()
    .from("themes")
    .select(
      "id, slug, name, description, primary_color, primary_hover_color, primary_foreground_color, soft_color, soft_dark_color, soft_foreground_color, soft_foreground_dark_color, border_color, border_dark_color, is_active, sort_order",
    )
    .eq("is_active", true)
    .order("sort_order")
    .order("name");

  if (error || !data?.length) return [];
  return data.map((row) => normalizeTheme(row as Record<string, unknown>));
});

export const getThemeById = cache(async (themeId: string | null | undefined) => {
  if (!themeId) return null;

  const { data, error } = await createServiceClient()
    .from("themes")
    .select(
      "id, slug, name, description, primary_color, primary_hover_color, primary_foreground_color, soft_color, soft_dark_color, soft_foreground_color, soft_foreground_dark_color, border_color, border_dark_color, is_active, sort_order",
    )
    .eq("id", themeId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  return normalizeTheme(data as Record<string, unknown>);
});

