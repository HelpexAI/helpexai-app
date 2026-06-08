export function SectionLoading({ label = "Loading page..." }: { label?: string }) {
  return (
    <div className="animate-pulse space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-44 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-72 max-w-full rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="h-10 w-32 rounded-lg bg-theme-soft dark:bg-theme-soft-dark" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="h-24 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
        ))}
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex min-h-52 max-w-sm flex-col items-center justify-center text-center">
          <div className="size-9 animate-spin rounded-full border-2 border-zinc-200 border-t-theme-primary dark:border-zinc-700" />
          <p className="mt-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
        </div>
      </div>
    </div>
  );
}
