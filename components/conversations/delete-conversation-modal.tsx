"use client";

import { ResponsiveModal } from "@/components/dashboard/responsive-modal";
import { Loader2, MessageSquare, Trash2 } from "lucide-react";

export function DeleteConversationModal({
  open,
  title,
  deleting,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ResponsiveModal open={open} onClose={() => { if (!deleting) onClose(); }} ariaLabel="Delete conversation confirmation" showClose={false}>
      <div className="flex flex-col items-center gap-6">
        <div className="flex size-20 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/40"><Trash2 className="size-10 text-red-500" /></div>
        <div className="space-y-3 text-center">
          <h2 className="text-2xl font-bold">Delete this conversation?</h2>
          <div className="mx-auto inline-flex max-w-full items-center gap-2 rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-800"><MessageSquare className="size-4 shrink-0 text-zinc-500" /><span className="truncate text-sm font-medium">{title}</span></div>
          <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">This permanently removes the conversation and all of its messages. This cannot be undone.</p>
        </div>
        <div className="flex w-full flex-col gap-2">
          <button type="button" onClick={onClose} disabled={deleting} className="h-11 rounded-lg border border-zinc-200 text-sm font-semibold dark:border-zinc-700">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={deleting} className="flex h-11 items-center justify-center gap-2 rounded-lg bg-red-500 text-sm font-semibold text-white disabled:opacity-60">{deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}{deleting ? "Deleting..." : "Delete Conversation"}</button>
        </div>
      </div>
    </ResponsiveModal>
  );
}

