function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800 ${className}`} />;
}

export function DocumentsContentSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 p-5 dark:border-zinc-800">
          <div className="space-y-2">
            <Pulse className="h-6 w-44" />
            <Pulse className="h-3 w-64 max-w-[55vw]" />
          </div>
          <Pulse className="h-10 w-36" />
        </div>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex items-center gap-3 p-5">
              <Pulse className="size-10 shrink-0" />
              <div className="flex-1 space-y-2">
                <Pulse className="h-4 w-52 max-w-[50vw]" />
                <Pulse className="h-3 w-32" />
              </div>
              <Pulse className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DocumentsPageSkeleton() {
  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-0 overflow-hidden bg-slate-50 dark:bg-zinc-950">
      <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 lg:block">
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Pulse key={index} className="h-10 w-full" />
          ))}
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <DocumentsContentSkeleton />
      </main>
    </div>
  );
}
