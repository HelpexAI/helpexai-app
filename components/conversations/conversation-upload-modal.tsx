"use client";

import { ResponsiveModal } from "@/components/dashboard/responsive-modal";
import { uploadDocumentsDirect } from "@/lib/client/direct-document-upload";
import { invalidateWorkspaceQueries } from "@/lib/client/query";
import { useWorkspaceReference } from "@/lib/client/workspace-reference";
import { MAX_FILE_SIZE } from "@/lib/validations/schemas";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";
import { ChangeEvent, useEffect, useRef, useState } from "react";

export function ConversationUploadModal({ open, onClose, onUploaded }: { open: boolean; onClose: () => void; onUploaded?: (ids: string[]) => void }) {
  const queryClient = useQueryClient();
  const { data: referenceData } = useWorkspaceReference();
  const inputRef = useRef<HTMLInputElement>(null);
  const [collectionId, setCollectionId] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && !collectionId && referenceData?.collections.length) {
      setCollectionId(referenceData.collections[0].id);
    }
  }, [collectionId, open, referenceData?.collections]);

  const collections = referenceData?.collections ?? [];
  const tags = referenceData?.tags ?? [];

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || saving) return;
    if (file.size > MAX_FILE_SIZE) return setError("Document must be no larger than 10MB.");
    setSaving(true); setError("");
    try {
      const documents = await uploadDocumentsDirect({
        files: [file],
        collectionId,
        tagIds,
      });
      if (!documents.length) throw new Error("Could not upload document.");
      await Promise.all(documents.map((document) => fetch(`/api/documents/${document.id}/process`, { method: "POST" })));
      await invalidateWorkspaceQueries(queryClient);
      onUploaded?.(documents.map((document) => document.id));
      onClose();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload document.");
    } finally { setSaving(false); }
  }

  return <ResponsiveModal open={open} onClose={() => { if (!saving) onClose(); }} ariaLabel="Upload conversation document"><div className="space-y-5"><div><h2 className="text-xl font-bold">Upload a Document</h2><p className="mt-1 text-sm text-zinc-500">Upload one document and attach its business context.</p></div><select value={collectionId} onChange={(event) => setCollectionId(event.target.value)} disabled={saving} className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950">{collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select><div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">{tags.map((tag) => { const selected = tagIds.includes(tag.id); return <button key={tag.id} type="button" disabled={saving} onClick={() => setTagIds((current) => selected ? current.filter((id) => id !== tag.id) : [...current, tag.id])} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${selected ? "border-theme-primary bg-theme-soft text-theme-primary dark:bg-theme-soft-dark" : "border-zinc-200 text-zinc-500 dark:border-zinc-700"}`}>{tag.name}</button>; })}</div><input ref={inputRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(event) => void upload(event)} /><button type="button" disabled={saving || !collectionId || !tagIds.length} onClick={() => inputRef.current?.click()} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-theme-primary text-sm font-semibold text-white disabled:opacity-50">{saving ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}Choose and Upload Document</button>{error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>}</div></ResponsiveModal>;
}
