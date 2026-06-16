"use client";

import { DeleteConversationModal } from "@/components/conversations/delete-conversation-modal";
import { ResponsiveModal } from "@/components/dashboard/responsive-modal";
import { formatRelativeTime } from "@/lib/utils";
import {
  FileText,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchJson,
  invalidateWorkspaceQueries,
  queryKeys,
} from "@/lib/client/query";
import { useQueryClient } from "@tanstack/react-query";

export type ConversationSummary = {
  id: string;
  title: string;
  conversation_scope: "documents" | "workplace";
  selected_document_ids: string[];
  external_research_enabled: boolean;
  updated_at: string;
};

export function ConversationSidebar({
  conversations: initialConversations,
  activeId,
  mobileOpen = false,
  onMobileClose,
}: {
  conversations: ConversationSummary[];
  activeId?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const [conversations, setConversations] = useState(initialConversations);
  const [search, setSearch] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<ConversationSummary | null>(null);
  const [deleting, setDeleting] = useState<ConversationSummary | null>(null);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const filtered = useMemo(
    () =>
      conversations.filter((conversation) =>
        conversation.title.toLowerCase().includes(search.toLowerCase()),
      ),
    [conversations, search],
  );
  function prefetchConversation(id: string) {
    router.prefetch(`/conversations/${id}`);
    void queryClient.prefetchQuery({
      queryKey: queryKeys.conversation(id),
      queryFn: () => fetchJson(`/api/conversations/${id}`),
    });
  }
  useEffect(
    () => setConversations(initialConversations),
    [initialConversations],
  );
  useEffect(() => {
    initialConversations
      .slice(0, 5)
      .forEach((conversation) => prefetchConversation(conversation.id));
    // Query client and router are stable for the lifetime of this mounted sidebar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConversations]);
  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuId(null);
    }
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  async function renameConversation(event: FormEvent) {
    event.preventDefault();
    if (!renaming || !title.trim()) return;
    setSaving(true);
    setError("");
    const response = await fetch(`/api/conversations/${renaming.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const result = (await response.json()) as {
      error?: string;
      conversation?: ConversationSummary;
    };
    if (!response.ok || !result.conversation) {
      setError(result.error ?? "Could not rename conversation.");
      setSaving(false);
      return;
    }
    setConversations((current) =>
      current.map((item) =>
        item.id === result.conversation!.id
          ? { ...item, ...result.conversation }
          : item,
      ),
    );
    setRenaming(null);
    setSaving(false);
    queryClient.setQueriesData<{ conversations?: ConversationSummary[] }>(
      { queryKey: queryKeys.conversations },
      (cached) =>
        cached
          ? {
              ...cached,
              conversations: cached.conversations?.map((item) =>
                item.id === result.conversation!.id
                  ? { ...item, ...result.conversation }
                  : item,
              ),
            }
          : cached,
    );
    queryClient.setQueryData<{ conversation?: ConversationSummary }>(
      queryKeys.conversation(result.conversation.id),
      (cached) =>
        cached
          ? {
              ...cached,
              conversation: cached.conversation
                ? { ...cached.conversation, ...result.conversation }
                : cached.conversation,
            }
          : cached,
    );
    await invalidateWorkspaceQueries(queryClient);
    router.refresh();
  }

  async function deleteConversation() {
    if (!deleting) return;
    setSaving(true);
    const response = await fetch(`/api/conversations/${deleting.id}`, {
      method: "DELETE",
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "Could not delete conversation.");
      setSaving(false);
      return;
    }
    const deletedId = deleting.id;
    setConversations((current) =>
      current.filter((item) => item.id !== deletedId),
    );
    setDeleting(null);
    setSaving(false);
    queryClient.setQueriesData<{ conversations?: ConversationSummary[] }>(
      { queryKey: queryKeys.conversations },
      (cached) =>
        cached
          ? {
              ...cached,
              conversations: cached.conversations?.filter(
                (item) => item.id !== deletedId,
              ),
            }
          : cached,
    );
    queryClient.removeQueries({ queryKey: queryKeys.conversation(deletedId) });
    await invalidateWorkspaceQueries(queryClient);
    router.refresh();
    if (activeId === deletedId || pathname === `/conversations/${deletedId}`) {
      router.replace("/conversations");
    }
  }

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close conversations"
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(88vw,20rem)] shrink-0 flex-col border-r border-zinc-200 bg-white shadow-2xl transition-transform dark:border-zinc-800 dark:bg-zinc-900 md:static md:z-auto md:w-64 md:translate-x-0 md:shadow-none ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 md:hidden">
          <p className="font-bold">Conversations</p>
          <button
            type="button"
            onClick={onMobileClose}
            className="flex size-8 items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="border-b border-zinc-200 p-3 dark:border-zinc-800">
          <label className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950">
            <Search className="size-4 text-zinc-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search conversations"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((conversation) => {
            const active = conversation.id === activeId;
            const count = conversation.selected_document_ids.length;
            const scopeLabel =
              conversation.conversation_scope === "workplace"
                ? "Workplace"
                : `${count} doc${count === 1 ? "" : "s"}`;
            const destination = active
              ? "/conversations"
              : `/conversations/${conversation.id}`;
            return (
              <div
                key={conversation.id}
                className={`group relative border-l-4 transition ${active ? "border-theme-primary bg-theme-soft dark:bg-theme-soft-dark" : "border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/60"}`}
              >
                <Link
                  href={destination}
                  prefetch
                  onMouseEnter={() =>
                    active
                      ? router.prefetch(destination)
                      : prefetchConversation(conversation.id)
                  }
                  onFocus={() =>
                    active
                      ? router.prefetch(destination)
                      : prefetchConversation(conversation.id)
                  }
                  onTouchStart={() =>
                    active
                      ? router.prefetch(destination)
                      : prefetchConversation(conversation.id)
                  }
                  onClick={onMobileClose}
                  aria-label={
                    active
                      ? `Close ${conversation.title}`
                      : `Open ${conversation.title}`
                  }
                  className="flex items-start gap-2.5 px-4 py-3 pr-10"
                >
                  <span
                    className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg ${active ? "bg-theme-primary/10 text-theme-primary" : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"}`}
                  >
                    <MessageSquare className="size-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-zinc-950 dark:text-white">
                      {conversation.title}
                    </span>
                    <span className="mt-1.5 flex items-center gap-2 text-[11px] text-zinc-400">
                      <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">
                        <FileText className="size-2.5" />
                        {scopeLabel}
                      </span>
                      <span>{formatRelativeTime(conversation.updated_at)}</span>
                    </span>
                  </span>
                </Link>
                <div ref={menuId === conversation.id ? menuRef : undefined}>
                  <button
                    type="button"
                    onClick={() =>
                      setMenuId((current) =>
                        current === conversation.id ? null : conversation.id,
                      )
                    }
                    className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white hover:text-zinc-700 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100 dark:hover:bg-zinc-800 dark:hover:text-white"
                    aria-label={`Actions for ${conversation.title}`}
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                  {menuId === conversation.id && (
                    <div className="absolute right-2 top-10 z-30 w-36 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                      <button
                        type="button"
                        onClick={() => {
                          setRenaming(conversation);
                          setTitle(conversation.title);
                          setMenuId(null);
                          setError("");
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <Pencil className="size-3.5" />
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleting(conversation);
                          setMenuId(null);
                          setError("");
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      <ResponsiveModal
        open={renaming !== null}
        onClose={() => {
          if (!saving) setRenaming(null);
        }}
        ariaLabel="Rename conversation"
      >
        <form onSubmit={renameConversation} className="space-y-5">
          <div>
            <h2 className="text-xl font-bold">Rename Conversation</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Choose a clear name so it is easy to find later.
            </p>
          </div>
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={100}
            className="h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-theme-primary dark:border-zinc-700 dark:bg-zinc-950"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            disabled={saving || !title.trim()}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-theme-primary font-semibold text-white disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Pencil className="size-4" />
            )}
            Save Name
          </button>
        </form>
      </ResponsiveModal>
      <DeleteConversationModal
        open={deleting !== null}
        title={deleting?.title ?? ""}
        deleting={saving}
        onClose={() => setDeleting(null)}
        onConfirm={() => void deleteConversation()}
      />
    </>
  );
}
