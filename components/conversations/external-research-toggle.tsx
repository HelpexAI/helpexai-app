"use client";

import { Globe2, Loader2 } from "lucide-react";

export function ExternalResearchToggle({
  enabled,
  onChange,
  disabled = false,
  compact = false,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      title={compact ? `External Research ${enabled ? "enabled" : "disabled"}. Only your question is sent for web search.` : undefined}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`flex items-center justify-between gap-3 rounded-xl border text-left transition disabled:cursor-wait disabled:opacity-70 ${
        compact ? "h-9 px-3" : "w-full p-3"
      } ${
        enabled
          ? "border-theme-primary bg-theme-soft dark:bg-theme-soft-dark"
          : "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950"
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        {disabled ? <Loader2 className="size-4 shrink-0 animate-spin text-theme-primary" /> : <Globe2 className={`size-4 shrink-0 ${enabled ? "text-theme-primary" : "text-zinc-400"}`} />}
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold sm:text-sm">External Research</span>
          {!compact && <span className="mt-0.5 block text-xs leading-5 text-zinc-500 dark:text-zinc-400">Use live web sources and outside knowledge. Only your question, never document text, is sent for web search.</span>}
        </span>
      </span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${enabled ? "bg-theme-primary" : "bg-zinc-300 dark:bg-zinc-700"}`}>
        <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-[18px]" : "translate-x-0.5"}`} />
      </span>
    </button>
  );
}
