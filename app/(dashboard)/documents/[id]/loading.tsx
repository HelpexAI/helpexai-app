export default function DocumentViewerLoading() {
  return (
    <div className="flex h-screen min-h-[620px] animate-pulse flex-col bg-[#18243a] text-white">
      <header className="flex min-h-16 items-center justify-between border-b border-white/10 bg-[#0a1628] px-4 sm:px-8">
        <div className="h-4 w-48 rounded bg-white/15" />
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-lg bg-white/10" />
          <div className="h-9 w-24 rounded-lg bg-white/10" />
        </div>
      </header>
      <div className="flex min-h-12 items-center justify-between border-b border-white/10 bg-[#10203a] px-4">
        <div className="h-7 w-44 rounded bg-white/10" />
        <div className="h-7 w-36 rounded bg-white/10" />
      </div>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-40 border-r border-white/10 bg-[#0d1b30] p-3 sm:block">
          <div className="h-4 w-14 rounded bg-white/10" />
          <div className="mt-4 h-28 rounded-lg bg-white/10" />
        </aside>
        <main className="flex flex-1 items-start justify-center p-4 sm:p-8">
          <div className="flex min-h-[70vh] w-full max-w-[850px] items-center justify-center rounded-lg bg-white shadow-2xl">
            <div className="text-center text-zinc-400">
              <div className="mx-auto size-9 animate-spin rounded-full border-2 border-zinc-200 border-t-theme-primary" />
              <p className="mt-3 text-sm font-medium">Opening document...</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
