"use client";

import { ResponsiveModal } from "@/components/dashboard/responsive-modal";
import { invalidateWorkspaceQueries, queryKeys } from "@/lib/client/query";
import { MAX_FILE_SIZE } from "@/lib/validations/schemas";
import { useQueryClient } from "@tanstack/react-query";
import { Check, FilePlus2, FileText, Loader2, Paperclip, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import type { DocumentCollection, DocumentTag } from "@/types";

type ManagedDocument = { id: string; name: string };

export function ConversationDocumentManager({
  conversationId,
  selectedDocuments,
  availableDocuments,
}: {
  conversationId: string;
  selectedDocuments: ManagedDocument[];
  availableDocuments: ManagedDocument[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(selectedDocuments.map((document) => document.id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [collections, setCollections] = useState<DocumentCollection[]>([]);
  const [tags, setTags] = useState<DocumentTag[]>([]);
  const [collectionId, setCollectionId] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);

  useEffect(() => {
    setSelected(selectedDocuments.map((document) => document.id));
  }, [selectedDocuments]);

  useEffect(() => {
    if (!open || collections.length) return;
    void fetch("/api/documents").then((response) => response.json()).then((body: { collections?: DocumentCollection[]; tags?: DocumentTag[] }) => {
      const nextCollections = body.collections ?? [];
      setCollections(nextCollections);
      setTags(body.tags ?? []);
      setCollectionId(nextCollections[0]?.id ?? "");
    });
  }, [collections.length, open]);

  async function saveDocuments(documentIds = selected) {
    if (!documentIds.length) {
      setError("A conversation must have at least one document.");
      return false;
    }
    const response = await fetch(`/api/conversations/${conversationId}/documents`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_ids: documentIds }),
    });
    const result = await response.json() as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "Could not attach documents.");
      return false;
    }
    await invalidateWorkspaceQueries(queryClient);
    await queryClient.invalidateQueries({ queryKey: queryKeys.conversation(conversationId) });
    await queryClient.refetchQueries({ queryKey: queryKeys.conversation(conversationId) });
    router.refresh();
    return true;
  }

  async function uploadAndAttach(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length || saving) return;
    if (!collectionId || !tagIds.length) {
      setError("Choose a collection and at least one tag before uploading.");
      return;
    }
    if (files.some((file) => file.size > MAX_FILE_SIZE)) {
      setError("Each document must be no larger than 10MB.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const form = new FormData();
      files.forEach((file) => form.append("files", file));
      form.append("collection_id", collectionId);
      tagIds.forEach((tagId) => form.append("tag_ids", tagId));
      const uploadResponse = await fetch("/api/documents", { method: "POST", body: form });
      const uploadResult = await uploadResponse.json() as {
        error?: string;
        documents?: Array<{ id: string }>;
      };
      if (!uploadResponse.ok || !uploadResult.documents?.length) {
        throw new Error(uploadResult.error ?? "Could not upload the document.");
      }

      await Promise.all(uploadResult.documents.map(async (document) => {
        const response = await fetch(`/api/documents/${document.id}/process`, { method: "POST" });
        if (!response.ok) {
          const result = await response.json() as { error?: string };
          throw new Error(result.error ?? "Could not process the uploaded document.");
        }
      }));

      const nextSelected = Array.from(new Set([...selected, ...uploadResult.documents.map((document) => document.id)]));
      setSelected(nextSelected);
      if (await saveDocuments(nextSelected)) setOpen(false);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload and attach the document.");
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    setSaving(true);
    setError("");
    if (await saveDocuments()) setOpen(false);
    setSaving(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-zinc-200 px-3 py-2.5 text-left text-sm font-semibold text-theme-primary hover:bg-theme-soft dark:border-zinc-700 dark:hover:bg-theme-soft-dark"
      >
        <Paperclip className="size-4" />
        Manage documents
      </button>
      <ResponsiveModal open={open} onClose={() => { if (!saving) setOpen(false); }} ariaLabel="Manage conversation documents">
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-bold">Manage Conversation Documents</h2>
            <p className="mt-1 text-sm text-zinc-500">Attach existing documents or upload a new one for future answers.</p>
          </div>
          <input ref={inputRef} type="file" accept=".pdf,.docx,.txt" multiple className="hidden" onChange={(event) => void uploadAndAttach(event)} />
          <div className="grid gap-3">
            <select value={collectionId} onChange={(event) => setCollectionId(event.target.value)} disabled={saving} className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"><option value="">Choose upload collection</option>{collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select>
            <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-zinc-200 p-2 dark:border-zinc-700">{tags.map((tag) => { const checked = tagIds.includes(tag.id); return <button key={tag.id} type="button" disabled={saving} onClick={() => setTagIds((current) => checked ? current.filter((id) => id !== tag.id) : [...current, tag.id])} className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${checked ? "border-theme-primary bg-theme-soft text-theme-primary dark:bg-theme-soft-dark" : "border-zinc-200 text-zinc-500 dark:border-zinc-700"}`}>{tag.name}</button>; })}</div>
          </div>
          <button type="button" onClick={() => inputRef.current?.click()} disabled={saving || !collectionId || !tagIds.length} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-theme-primary bg-theme-soft text-sm font-semibold text-theme-primary disabled:opacity-50 dark:bg-theme-soft-dark">
            <Upload className="size-4" />
            Upload and Attach Documents
          </button>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {availableDocuments.map((document) => {
              const checked = selected.includes(document.id);
              return (
                <button key={document.id} type="button" disabled={saving} onClick={() => setSelected((current) => checked ? current.filter((id) => id !== document.id) : [...current, document.id])} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${checked ? "border-theme-primary bg-theme-soft dark:bg-theme-soft-dark" : "border-zinc-200 dark:border-zinc-700"}`}>
                  <span className={`flex size-5 shrink-0 items-center justify-center rounded border ${checked ? "border-theme-primary bg-theme-primary text-white" : "border-zinc-300 dark:border-zinc-600"}`}>{checked && <Check className="size-3" />}</span>
                  <FileText className="size-4 shrink-0 text-theme-primary" />
                  <span className="min-w-0 truncate text-sm font-semibold">{document.name}</span>
                </button>
              );
            })}
            {!availableDocuments.length && <p className="py-6 text-center text-sm text-zinc-500">No documents are available yet.</p>}
          </div>
          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
          <button type="button" onClick={() => void submit()} disabled={saving || !selected.length} className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-theme-primary text-sm font-semibold text-white disabled:opacity-50">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <FilePlus2 className="size-4" />}
            Save Attached Documents
          </button>
        </div>
      </ResponsiveModal>
    </>
  );
}
