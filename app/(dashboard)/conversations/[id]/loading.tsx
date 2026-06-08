export default function ConversationLoading() {
  return (
    <div className="flex h-screen min-h-[620px] animate-pulse overflow-hidden">
      <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 md:block">
        <div className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-16 rounded-lg bg-zinc-100 dark:bg-zinc-800" />)}
        </div>
      </aside>
      <section className="flex min-w-0 flex-1 flex-col bg-slate-50 dark:bg-zinc-950">
        <header className="flex min-h-16 items-center justify-between border-b border-zinc-200 bg-white px-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="h-5 w-44 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-9 w-28 rounded-full bg-zinc-100 dark:bg-zinc-800" />
        </header>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center text-zinc-500">
            <div className="mx-auto size-9 animate-spin rounded-full border-2 border-zinc-200 border-t-theme-primary dark:border-zinc-800" />
            <p className="mt-3 text-sm font-medium">Opening conversation...</p>
          </div>
        </div>
        <div className="border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
        </div>
      </section>
    </div>
  );
}
