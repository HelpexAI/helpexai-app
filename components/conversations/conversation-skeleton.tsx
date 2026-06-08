export function ConversationSkeleton({ root = false }: { root?: boolean }) {
  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-[620px] overflow-hidden">
      <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:block">
        <div className="border-b border-zinc-200 p-3 dark:border-zinc-800">
          <div className="h-10 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
        </div>
        <div className="space-y-1 p-2">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex items-center gap-3 rounded-lg p-3">
              <div className="size-7 shrink-0 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-4 flex-1 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            </div>
          ))}
        </div>
      </aside>
      <section className="flex min-w-0 flex-1 flex-col bg-slate-50 dark:bg-zinc-950">
        <header className="flex min-h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6">
          <div className="h-5 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-8 w-24 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
        </header>
        {root ? (
          <div className="flex flex-1 items-center justify-center p-5">
            <div className="text-center text-zinc-400">
              <div className="mx-auto size-7 animate-spin rounded-full border-2 border-zinc-200 border-t-theme-primary dark:border-zinc-800" />
            </div>
          </div>
        ) : (
          <div className="flex-1 space-y-5 overflow-hidden p-4 sm:p-6">
            <div className="ml-auto h-12 w-2/5 animate-pulse rounded-2xl rounded-tr-sm bg-theme-soft dark:bg-theme-soft-dark" />
            <div className="h-20 w-3/5 animate-pulse rounded-2xl rounded-tl-sm bg-white shadow-sm dark:bg-zinc-900" />
            <div className="ml-auto h-10 w-1/3 animate-pulse rounded-2xl rounded-tr-sm bg-theme-soft dark:bg-theme-soft-dark" />
          </div>
        )}
        <div className="border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="h-11 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
        </div>
      </section>
    </div>
  );
}
