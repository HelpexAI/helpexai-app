"use client";

import { AlertTriangle, RotateCw } from "lucide-react";

export function ClientPageError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-5">
      <div className="max-w-md rounded-2xl border border-red-200 bg-white p-7 text-center shadow-sm dark:border-red-900 dark:bg-zinc-900">
        <AlertTriangle className="mx-auto size-8 text-red-500" />
        <h2 className="mt-3 text-lg font-bold">Could not load this page</h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
        <button type="button" onClick={onRetry} className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-theme-primary px-4 text-sm font-semibold text-white">
          <RotateCw className="size-4" />
          Try again
        </button>
      </div>
    </div>
  );
}
