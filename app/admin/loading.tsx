export default function AdminLoading() {
  return <div className="space-y-6 animate-pulse"><div className="space-y-2"><div className="h-7 w-56 rounded bg-zinc-200 dark:bg-zinc-800" /><div className="h-4 w-96 max-w-full rounded bg-zinc-200 dark:bg-zinc-800" /></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-28 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />)}</div><div className="h-80 rounded-2xl bg-zinc-200 dark:bg-zinc-800" /></div>;
}

