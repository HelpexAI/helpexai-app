export function ConversationSkeleton({ root = false }: { root?: boolean }) {
  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-[620px] animate-pulse overflow-hidden">
      <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:block">
        <div className="border-b border-zinc-200 p-3 dark:border-zinc-800">
          <div className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
        </div>
        <div className="space-y-1 p-2">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex gap-3 rounded-lg p-3">
              <div className="size-7 shrink-0 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
              <div className="flex-1 space-y-2">
                <div className="h-4 rounded bg-zinc-100 dark:bg-zinc-800" />
                <div className="h-3 w-3/5 rounded bg-zinc-100 dark:bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      </aside>
      <section className="flex min-w-0 flex-1 flex-col bg-slate-50 dark:bg-zinc-950">
        <header className="flex min-h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6">
          <div className="space-y-2"><div className="h-5 w-44 rounded bg-zinc-200 dark:bg-zinc-800" /><div className="h-3 w-28 rounded bg-zinc-100 dark:bg-zinc-800" /></div>
          <div className="h-9 w-28 rounded-full bg-zinc-100 dark:bg-zinc-800" />
        </header>
        {root ? (
          <div className="flex flex-1 items-start justify-center p-5 pt-14">
            <div className="h-72 w-full max-w-lg rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
          </div>
        ) : (
          <div className="flex-1 space-y-6 overflow-hidden p-4 sm:p-6">
            <div className="ml-auto h-14 w-3/5 rounded-2xl rounded-tr-sm bg-theme-soft dark:bg-theme-soft-dark" />
            <div className="flex gap-3"><div className="size-8 shrink-0 rounded-full bg-theme-soft dark:bg-theme-soft-dark" /><div className="h-32 w-3/4 rounded-2xl rounded-tl-sm bg-white shadow-sm dark:bg-zinc-900" /></div>
            <div className="ml-auto h-14 w-2/5 rounded-2xl rounded-tr-sm bg-theme-soft dark:bg-theme-soft-dark" />
            <div className="flex gap-3"><div className="size-8 shrink-0 rounded-full bg-theme-soft dark:bg-theme-soft-dark" /><div className="h-24 w-2/3 rounded-2xl rounded-tl-sm bg-white shadow-sm dark:bg-zinc-900" /></div>
          </div>
        )}
        <div className="border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
        </div>
      </section>
    </div>
  );
}
