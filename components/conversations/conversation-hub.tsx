"use client";

import { ConversationSidebar, type ConversationSummary } from "@/components/conversations/conversation-sidebar";
import { ResponsiveModal } from "@/components/dashboard/responsive-modal";
import { formatFileSize } from "@/lib/utils";
import type { CategorySlug, Document } from "@/types";
import { ArrowRight, Check, FileText, List, Loader2, Lock, MessageSquarePlus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { queryKeys } from "@/lib/client/query";
import { useQueryClient } from "@tanstack/react-query";

export function ConversationHub({
  conversations,
  documents,
  category,
}: {
  conversations: ConversationSummary[];
  documents: Pick<Document, "id" | "name" | "file_size" | "file_type">[];
  category: CategorySlug;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mobileConversationsOpen, setMobileConversationsOpen] = useState(false);

  async function startConversation() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category_slug: category, selected_document_ids: selected }),
    });
    const result = (await response.json()) as { error?: string; conversation?: { id: string } };
    if (!response.ok || !result.conversation) {
      setError(result.error ?? "Could not start conversation.");
      setLoading(false);
      return;
    }
    void queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    router.push(`/conversations/${result.conversation.id}`);
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {conversations.length > 0 && <ConversationSidebar conversations={conversations} mobileOpen={mobileConversationsOpen} onMobileClose={() => setMobileConversationsOpen(false)} />}
      <section className="flex flex-1 items-start justify-center bg-slate-50 p-4 pt-10 dark:bg-zinc-950 sm:p-8 sm:pt-16">
        <div className="w-full max-w-lg">
          {conversations.length > 0 && <button type="button" onClick={() => setMobileConversationsOpen(true)} className="mb-4 flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold shadow-sm dark:border-zinc-700 dark:bg-zinc-900 md:hidden"><List className="size-4 text-theme-primary" />View conversations</button>}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-theme-soft text-theme-primary dark:bg-theme-soft-dark dark:text-theme-soft-foreground-dark"><MessageSquarePlus className="size-8" /></div>
          <h2 className="mt-5 text-2xl font-bold">Start New Conversation</h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Choose the documents HelpexAI should use for this chat.</p>
          {documents.length ? (
            <button onClick={() => setModalOpen(true)} className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-theme-primary px-6 text-sm font-semibold text-white transition hover:bg-theme-primary-hover"><Plus className="size-4" />Select Documents</button>
          ) : (
            <button onClick={() => router.push("/documents/upload")} className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-theme-primary px-6 text-sm font-semibold text-white">Upload a Document</button>
          )}
          </div>
        </div>
      </section>

      <ResponsiveModal open={modalOpen} onClose={() => setModalOpen(false)} ariaLabel="Select conversation documents">
        <div className="space-y-5">
          <div><h2 className="text-xl font-bold">Select Documents</h2><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Choose one or more documents for this conversation.</p></div>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {documents.map((document) => {
              const checked = selected.includes(document.id);
              return (
                <button key={document.id} type="button" onClick={() => setSelected((current) => checked ? current.filter((id) => id !== document.id) : [...current, document.id])} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${checked ? "border-theme-primary bg-theme-soft dark:bg-theme-soft-dark" : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700"}`}>
                  <span className={`flex size-5 shrink-0 items-center justify-center rounded border ${checked ? "border-theme-primary bg-theme-primary text-white" : "border-zinc-300 dark:border-zinc-600"}`}>{checked && <Check className="size-3" />}</span>
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${document.file_type === "pdf" ? "bg-red-50 text-red-500 dark:bg-red-950/40" : "bg-theme-soft text-theme-primary dark:bg-theme-soft-dark"}`}><FileText className="size-4" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{document.name}</span><span className="text-xs text-zinc-400">{formatFileSize(document.file_size)}</span></span>
                </button>
              );
            })}
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"><Lock className="mt-0.5 size-3.5 shrink-0" />Document selection locks once the conversation is started.</div>
          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button onClick={() => void startConversation()} disabled={!selected.length || loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-theme-primary font-semibold text-white disabled:opacity-50">{loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}Start Conversation</button>
        </div>
      </ResponsiveModal>
    </div>
  );
}
