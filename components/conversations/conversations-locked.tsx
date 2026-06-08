import { FileWarning, Lock } from "lucide-react";
import Link from "next/link";

export function ConversationsLocked({
  used,
  limit,
}: {
  used: number;
  limit: number;
}) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-start justify-center bg-slate-50 p-4 pt-12 dark:bg-zinc-950 sm:p-8 sm:pt-20">
      <section className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-7 text-center shadow-sm dark:border-amber-900 dark:bg-zinc-900">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
          <Lock className="size-7" />
        </div>
        <h2 className="mt-5 text-2xl font-bold">Resolve your document limit</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          Your current plan allows {limit} document{limit === 1 ? "" : "s"}, but this workspace has {used}.
          Conversations are paused until you choose which documents to keep.
        </p>
        <Link
          href="/documents"
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-theme-primary px-6 text-sm font-semibold text-white transition hover:bg-theme-primary-hover"
        >
          <FileWarning className="size-4" />
          Choose Documents to Keep
        </Link>
      </section>
    </div>
  );
}
