"use client";

import { CheckCircle2, FileText, Loader2, Lock, Mail, Send, Sparkles, Upload, X } from "lucide-react";
import Link from "next/link";
import { DragEvent, FormEvent, useEffect, useRef, useState } from "react";
import { MarkdownMessage } from "@/components/conversations/markdown-message";
import { ExternalResearchToggle } from "@/components/conversations/external-research-toggle";

type Source = { docName: string; excerpt: string };
type ToolMessage = { id: string; role: "user" | "assistant"; content: string; sources?: Source[] };
type Session = {
  documentName: string;
  emailCaptured: boolean;
  questionsUsed: number;
  messages: ToolMessage[];
  expiresAt: string;
  externalResearchEnabled: boolean;
  documentReadable: boolean;
};

export function PublicDocumentTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const interactedRef = useRef(false);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<"upload" | "email" | "question" | "research" | null>(null);
  const [restoringSession, setRestoringSession] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState("");
  const [limitPromptOpen, setLimitPromptOpen] = useState(false);
  const limitReached = (session?.questionsUsed ?? 0) >= 5;

  useEffect(() => {
    fetch("/api/public-tool")
      .then((response) => response.json())
      .then((body) => {
        if (!interactedRef.current) setSession(body.session ?? null);
      })
      .catch(() => undefined)
      .finally(() => setRestoringSession(false));
  }, []);

  useEffect(() => {
    if (loading !== "upload") return;
    const interval = window.setInterval(() => {
      setUploadProgress((current) => {
        if (current >= 92) return current;
        const increment = current < 30 ? 7 : current < 65 ? 4 : 2;
        return Math.min(current + increment, 92);
      });
    }, 450);
    return () => window.clearInterval(interval);
  }, [loading]);

  async function upload(file?: File) {
    if (!file || loading) return;
    interactedRef.current = true;
    setLoading("upload");
    setError("");
    setWarning("");
    setUploadFileName(file.name);
    setUploadProgress(8);
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/public-tool", { method: "POST", body: form });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Could not upload document.");
      setUploadProgress(0);
    }
    else {
      setUploadProgress(100);
      await new Promise((resolve) => window.setTimeout(resolve, 250));
      setSession(body.session);
      if (body.warning) setWarning(body.warning);
    }
    setLoading(null);
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void upload(event.dataTransfer.files[0]);
  }

  async function activate(event: FormEvent) {
    event.preventDefault();
    setLoading("email");
    setError("");
    const response = await fetch("/api/public-tool/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, marketingConsent: consent }),
    });
    const body = await response.json();
    if (!response.ok) setError(body.error ?? "Could not activate the tool.");
    else setSession((current) => current ? { ...current, emailCaptured: true } : current);
    setLoading(null);
  }

  async function ask(event: FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (!text || loading) return;
    if (limitReached) {
      setLimitPromptOpen(true);
      return;
    }
    setLoading("question");
    setError("");
    setQuestion("");
    const response = await fetch("/api/public-tool/question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: text }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Could not answer your question.");
      if (body.code === "PUBLIC_QUESTION_LIMIT") {
        setSession((current) => current ? { ...current, questionsUsed: 5 } : current);
        setLimitPromptOpen(true);
      }
    } else {
      setSession((current) => current ? {
        ...current,
        questionsUsed: body.questionsUsed,
        messages: [...current.messages, body.userMessage, body.assistantMessage],
      } : current);
    }
    setLoading(null);
  }

  async function updateExternalResearch(enabled: boolean) {
    if (!session?.emailCaptured || loading) return;
    const previous = session.externalResearchEnabled;
    setSession({ ...session, externalResearchEnabled: enabled });
    setLoading("research");
    setError("");
    const response = await fetch("/api/public-tool/research", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ externalResearchEnabled: enabled }),
    });
    const body = await response.json();
    if (!response.ok) {
      setSession((current) => current ? { ...current, externalResearchEnabled: previous } : current);
      setError(body.error ?? "Could not update External Research.");
    }
    setLoading(null);
  }

  async function removeDocument() {
    await fetch("/api/public-tool", { method: "DELETE" });
    setSession(null);
    setEmail("");
    setConsent(false);
    setQuestion("");
    setError("");
    setWarning("");
    setUploadProgress(0);
    setUploadFileName("");
    setLimitPromptOpen(false);
  }

  if (!session) {
    return (
      <div className="space-y-4">
        {restoringSession && <p className="flex items-center justify-center gap-2 text-xs text-zinc-400"><Loader2 className="size-3.5 animate-spin text-theme-primary" />Checking for a previous session in the background...</p>}
        <div
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={drop}
          onClick={() => loading !== "upload" && inputRef.current?.click()}
          className={`flex min-h-80 flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-6 text-center transition sm:p-12 ${loading === "upload" ? "cursor-wait border-theme-primary bg-theme-soft/40 dark:bg-theme-soft-dark/40" : dragging ? "cursor-pointer border-theme-primary bg-theme-soft dark:bg-theme-soft-dark" : "cursor-pointer border-zinc-300 bg-zinc-50 hover:border-theme-primary dark:border-zinc-700 dark:bg-zinc-950/50"}`}
        >
          <input ref={inputRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(event) => void upload(event.target.files?.[0])} />
          {loading === "upload" ? (
            <UploadProgress fileName={uploadFileName} progress={uploadProgress} />
          ) : (
            <>
              <div className="flex size-16 items-center justify-center rounded-2xl bg-theme-soft text-theme-primary dark:bg-theme-soft-dark"><Upload className="size-8" /></div>
              <div><h2 className="text-xl font-bold">Drop your document here</h2><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">or tap to browse your files</p></div>
              <div className="flex gap-2">{["PDF", "DOCX", "TXT"].map((type) => <span key={type} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-600 shadow-sm dark:bg-zinc-800 dark:text-zinc-300">{type}</span>)}</div>
              <button type="button" className="flex h-11 items-center gap-2 rounded-full bg-theme-primary px-6 text-sm font-semibold text-white"><Upload className="size-4" /> Browse Files</button>
              <p className="text-xs text-zinc-400">One document, maximum 10MB</p>
            </>
          )}
        </div>
        {error && <ErrorMessage message={error} />}
        {warning && <WarningMessage message={warning} />}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-2"><CheckCircle2 className={`size-5 shrink-0 ${session.documentReadable ? "text-emerald-500" : "text-amber-500"}`} /><div className="min-w-0"><p className="truncate text-sm font-semibold">{session.documentName}</p><p className={`text-xs ${session.documentReadable ? "text-emerald-600" : "text-amber-600"}`}>{session.documentReadable ? "Document ready to analyze" : "Uploaded with limited readable text"}</p></div></div>
        <button onClick={() => void removeDocument()} className="flex items-center gap-1 self-start text-xs font-medium text-zinc-500 hover:text-red-500 sm:self-auto"><X className="size-3.5" /> Remove</button>
      </div>

      {!session.emailCaptured ? (
        <form onSubmit={activate} className="mx-auto flex max-w-lg flex-col gap-5 px-5 py-10 sm:px-8">
          {warning && <WarningMessage message={warning} />}
          <div className="text-center"><div className="mx-auto flex size-14 items-center justify-center rounded-full bg-theme-soft text-theme-primary dark:bg-theme-soft-dark"><Mail className="size-6" /></div><h2 className="mt-4 text-xl font-bold">Where should we unlock your questions?</h2><p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">Enter your email to ask up to 5 questions about this document.</p></div>
          <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" className="h-12 rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none focus:border-theme-primary dark:border-zinc-700 dark:bg-zinc-950" />
          <label className="flex items-start gap-3 text-xs leading-5 text-zinc-500 dark:text-zinc-400"><input type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 accent-[var(--theme-primary)]" /><span>I agree to receive occasional product updates from HelpexAI. My document text is automatically deleted after 24 hours.</span></label>
          <button disabled={loading === "email"} className="flex h-12 items-center justify-center gap-2 rounded-full bg-theme-primary font-semibold text-white disabled:opacity-70">{loading === "email" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Start Asking Questions</button>
          {error && <ErrorMessage message={error} />}
        </form>
      ) : (
        <>
          <div className="relative">
            <div className="public-tool-scrollbar h-[360px] space-y-4 overflow-y-auto overscroll-contain bg-zinc-50 px-4 py-6 dark:bg-zinc-950/50 sm:h-[480px] sm:px-6">
              {!session.messages.length && <div className="flex min-h-56 flex-col items-center justify-center text-center"><Sparkles className="size-8 text-theme-primary" /><h2 className="mt-3 font-bold">Ask anything about your document</h2><p className="mt-1 text-sm text-zinc-500">Try asking for a summary, key dates, obligations, or risks.</p></div>}
              {session.messages.map((message) => <ChatMessage key={message.id} message={message} />)}
              {loading === "question" && <div className="flex items-center gap-2 text-sm text-zinc-500"><Loader2 className="size-4 animate-spin text-theme-primary" /> Analyzing your document...</div>}
            </div>
            {limitPromptOpen && <div className="absolute inset-0 flex items-center justify-center bg-white/75 p-5 backdrop-blur-sm dark:bg-zinc-950/75"><div className="max-w-sm rounded-2xl border border-zinc-200 bg-white p-7 text-center shadow-xl dark:border-zinc-700 dark:bg-zinc-900"><Lock className="mx-auto size-9 text-theme-primary" /><h2 className="mt-3 text-xl font-bold">You&apos;ve used all 5 free questions</h2><p className="mt-2 text-sm text-zinc-500">Create a free account for 5 questions every day and up to 3 documents.</p><Link href="/signup" className="mt-5 flex h-11 items-center justify-center rounded-full bg-theme-primary font-semibold text-white">Create Free Account</Link><Link href="/#pricing" className="mt-2 block text-sm font-medium text-theme-primary">See pricing plans</Link></div></div>}
          </div>
          <div className="border-t border-zinc-200 px-4 py-4 dark:border-zinc-800 sm:px-6">
            <div className="mb-3">
              <ExternalResearchToggle enabled={session.externalResearchEnabled} disabled={loading === "research"} onChange={(enabled) => void updateExternalResearch(enabled)} />
            </div>
            <div className="mb-3 flex items-center justify-between text-xs text-zinc-500"><span>{session.questionsUsed}/5 questions used</span><div className="flex gap-1">{Array.from({ length: 5 }).map((_, index) => <span key={index} className={`size-2 rounded-full ${index < session.questionsUsed ? "bg-theme-primary" : "bg-zinc-200 dark:bg-zinc-700"}`} />)}</div></div>
            <form onSubmit={ask} className="flex gap-2"><input disabled={limitPromptOpen || loading === "question"} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={limitPromptOpen ? "Free question limit reached" : "Ask anything about your document..."} className="h-12 min-w-0 flex-1 rounded-full border border-zinc-200 bg-white px-5 text-sm outline-none focus:border-theme-primary disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:disabled:bg-zinc-800" /><button disabled={limitPromptOpen || loading === "question" || !question.trim()} className="flex size-12 shrink-0 items-center justify-center rounded-full bg-theme-primary text-white disabled:opacity-40"><Send className="size-4" /></button></form>
            {error && <div className="mt-3"><ErrorMessage message={error} /></div>}
            {warning && <div className="mt-3"><WarningMessage message={warning} /></div>}
          </div>
        </>
      )}
    </div>
  );
}

function ChatMessage({ message }: { message: ToolMessage }) {
  if (message.role === "user") return <div className="flex justify-end"><div className="max-w-[88%] rounded-2xl rounded-br-sm bg-theme-primary px-4 py-3 text-sm leading-6 text-white sm:max-w-[75%]">{message.content}</div></div>;
  return <div className="flex gap-3"><div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-xs font-bold text-white dark:bg-white dark:text-zinc-950">H</div><div className="max-w-[88%] space-y-3 rounded-2xl rounded-bl-sm border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 dark:border-zinc-700 dark:bg-zinc-900 sm:max-w-[78%]"><MarkdownMessage content={message.content} />{message.sources?.map((source) => <div key={source.docName} className="rounded-lg border-l-2 border-theme-primary bg-theme-soft px-3 py-2 text-xs text-zinc-600 dark:bg-theme-soft-dark dark:text-zinc-300"><FileText className="mr-1 inline size-3 text-theme-primary" />{source.docName}<p className="mt-1 line-clamp-2 italic opacity-75">{source.excerpt}</p></div>)}</div></div>;
}

function ErrorMessage({ message }: { message: string }) {
  return <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{message}</div>;
}

function WarningMessage({ message }: { message: string }) {
  return <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">{message}</div>;
}

function UploadProgress({ fileName, progress }: { fileName: string; progress: number }) {
  const stage =
    progress < 30
      ? "Uploading securely..."
      : progress < 65
        ? "Extracting readable text..."
        : progress < 90
          ? "Cleaning and preparing content..."
          : progress < 100
            ? "Preparing your question session..."
            : "Document ready";

  return (
    <div className="w-full max-w-md" role="status" aria-live="polite">
      <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-theme-soft text-theme-primary dark:bg-theme-soft-dark">
        {progress === 100 ? <CheckCircle2 className="size-8" /> : <FileText className="size-8" />}
      </div>
      <h2 className="mt-4 truncate text-lg font-bold">{fileName}</h2>
      <p className="mt-1 text-sm font-medium text-theme-primary">{stage}</p>
      <div className="mt-5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
        <div
          className="h-2 rounded-full bg-theme-primary transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>Please keep this page open</span>
        <span className="font-semibold text-theme-primary">{progress}%</span>
      </div>
    </div>
  );
}
