"use client";

import { ConversationSidebar, type ConversationSummary } from "@/components/conversations/conversation-sidebar";
import { CitationPreviewPanel } from "@/components/conversations/citation-preview-panel";
import { PlanLimitModal } from "@/components/dashboard/plan-limit-modal";
import { AI_DISCLAIMERS, stripAiDisclaimer } from "@/lib/ai/disclaimer";
import type { CategorySlug, Message, MessageSource } from "@/types";
import { AlertTriangle, Bot, ChevronDown, ChevronLeft, ChevronUp, Eye, FileText, Loader2, Lock, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

type ChatDocument = { id: string; name: string };

function Sources({ sources, onPreview }: { sources: MessageSource[]; onPreview: (source: MessageSource) => void }) {
  const [open, setOpen] = useState(false);
  if (!sources.length) return null;
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60">
      <button onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-theme-primary">
        <span>{sources.length} source{sources.length === 1 ? "" : "s"}</span>{open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>
      {open && <div className="space-y-2 border-t border-zinc-200 p-3 dark:border-zinc-700">{sources.map((source, index) => <button type="button" onClick={() => onPreview(source)} key={`${source.docId}-${index}`} className="block w-full rounded-lg border-l-2 border-theme-primary bg-white p-3 text-left transition hover:bg-theme-soft dark:bg-zinc-900 dark:hover:bg-theme-soft-dark"><span className="flex items-center justify-between gap-2 text-xs font-semibold"><span className="flex min-w-0 items-center gap-1.5"><FileText className="size-3 shrink-0 text-theme-primary" /><span className="truncate">{source.docName}</span><span className="shrink-0 text-zinc-500">{source.pageNumber ? `Page ${source.pageNumber}` : "Find page"}</span></span><Eye className="size-3.5 shrink-0 text-theme-primary" /></span><span className="mt-1 line-clamp-2 text-xs italic text-zinc-500">{source.excerpt}</span></button>)}</div>}
    </div>
  );
}

export function ActiveConversation({
  conversation,
  conversations,
  documents,
  initialMessages,
  category,
  questionsUsed,
  questionsLimit,
}: {
  conversation: ConversationSummary;
  conversations: ConversationSummary[];
  documents: ChatDocument[];
  initialMessages: Message[];
  category: CategorySlug;
  questionsUsed: number;
  questionsLimit: number;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [title, setTitle] = useState(conversation.title);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [error, setError] = useState("");
  const [used, setUsed] = useState(questionsUsed);
  const [limitModalOpen, setLimitModalOpen] = useState(questionsUsed >= questionsLimit);
  const [activeCitation, setActiveCitation] = useState<MessageSource | null>(null);
  const limitReached = used >= questionsLimit;
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, loading]);
  useEffect(() => setTitle(conversation.title), [conversation.title]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const content = input.trim();
    if (limitReached) {
      setLimitModalOpen(true);
      return;
    }
    if (!content || loading) return;
    setInput("");
    setLoading(true);
    setError("");
    const optimistic: Message = { id: crypto.randomUUID(), conversation_id: conversation.id, role: "user", content, sources: [], answer_type: null, tokens_used: null, created_at: new Date().toISOString() };
    setMessages((current) => [...current, optimistic]);
    if (title === "New Conversation") setTitle(content.split(/\s+/).slice(0, 7).join(" "));

    const response = await fetch(`/api/conversations/${conversation.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content, category_slug: category }) });
    const result = (await response.json()) as { error?: string; code?: string; counted?: boolean; assistantMessage?: Message };
    if (!response.ok || !result.assistantMessage) {
      setMessages((current) => current.filter((message) => message.id !== optimistic.id));
      setError(result.error ?? "Could not send message.");
      if (result.code === "QUERY_LIMIT_REACHED") {
        setUsed(questionsLimit);
        setLimitModalOpen(true);
      }
      setLoading(false);
      return;
    }
    setMessages((current) => [...current, result.assistantMessage!]);
    if (result.counted) setUsed((value) => value + 1);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex h-screen min-h-[620px] overflow-hidden">
      <ConversationSidebar conversations={conversations} activeId={conversation.id} />
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="relative flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6">
          <div className="flex min-w-0 items-center gap-3"><Link href="/conversations" className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 md:hidden"><ChevronLeft className="size-4" /></Link><div className="min-w-0"><h2 className="truncate font-bold">{title}</h2><p className="text-xs text-zinc-400"><Lock className="mr-1 inline size-3" />Documents locked</p></div></div>
          <div className="relative">
            <button onClick={() => setDocsOpen((value) => !value)} className="flex h-9 items-center gap-2 rounded-full border border-theme-border bg-theme-soft px-3 text-xs font-semibold text-theme-primary dark:border-theme-border-dark dark:bg-theme-soft-dark"><FileText className="size-3.5" />{documents.length} document{documents.length === 1 ? "" : "s"}<ChevronDown className="size-3" /></button>
            {docsOpen && <div className="absolute right-0 top-11 z-20 w-72 rounded-xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">{documents.map((document) => <Link key={document.id} href={`/documents/${document.id}`} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-theme-soft hover:text-theme-primary dark:hover:bg-theme-soft-dark"><FileText className="size-4 shrink-0" /><span className="truncate">{document.name}</span></Link>)}</div>}
          </div>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto bg-slate-50 p-4 dark:bg-zinc-950 sm:p-6">
          {!messages.length && <div className="mx-auto mt-12 max-w-md text-center"><div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-theme-soft text-theme-primary dark:bg-theme-soft-dark"><Bot className="size-7" /></div><h3 className="mt-4 text-xl font-bold">Ask your first question</h3><p className="mt-2 text-sm text-zinc-500">Your first message will automatically name this conversation.</p></div>}
          {messages.map((message) => message.role === "user" ? <div key={message.id} className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-theme-primary px-4 py-3 text-sm leading-6 text-white sm:max-w-[70%]">{message.content}</div></div> : <div key={message.id} className="flex items-start gap-3"><div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-theme-soft text-theme-primary dark:bg-theme-soft-dark"><Bot className="size-4" /></div><div className="max-w-[88%] space-y-2 sm:max-w-[75%]"><div className="rounded-2xl rounded-tl-sm border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 dark:border-zinc-800 dark:bg-zinc-900">{stripAiDisclaimer(message.content)}</div><Sources sources={(message.sources ?? []) as MessageSource[]} onPreview={setActiveCitation} /></div></div>)}
          {loading && <div className="flex items-start gap-3"><div className="flex size-8 items-center justify-center rounded-full bg-theme-soft text-theme-primary"><Bot className="size-4" /></div><div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"><Loader2 className="size-4 animate-spin" />Analyzing documents...</div></div>}
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"><AlertTriangle className="size-3.5 shrink-0" />{AI_DISCLAIMERS[category]}</div>
          <div ref={endRef} />
        </div>

        <form onSubmit={sendMessage} className="shrink-0 border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6 sm:py-4">
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
          <div className="flex items-center gap-2"><input value={input} onChange={(event) => setInput(event.target.value)} disabled={limitReached} placeholder={limitReached ? "Daily question limit reached" : "Ask anything about your documents..."} className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm outline-none focus:border-theme-primary disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:disabled:bg-zinc-800" /><button type="submit" onClick={() => { if (limitReached) setLimitModalOpen(true); }} disabled={loading || (!input.trim() && !limitReached)} aria-label={limitReached ? "View upgrade options" : "Send message"} className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-theme-primary text-white disabled:cursor-not-allowed disabled:opacity-50">{limitReached ? <Lock className="size-4" /> : <Send className="size-4" />}</button></div>
          <div className="mt-2 flex items-center gap-3 text-xs text-zinc-400"><span>{used}/{questionsLimit} questions today</span><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"><div className="h-full rounded-full bg-theme-primary" style={{ width: `${Math.min(100, questionsLimit ? (used / questionsLimit) * 100 : 0)}%` }} /></div></div>
        </form>
      </section>
      {activeCitation && <CitationPreviewPanel source={activeCitation} onClose={() => setActiveCitation(null)} />}
      <PlanLimitModal open={limitModalOpen} onClose={() => setLimitModalOpen(false)} used={used} limit={questionsLimit} resource="questions today" />
    </div>
  );
}
