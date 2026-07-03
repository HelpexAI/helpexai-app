import { createClient } from "@/lib/supabase/client";

type PreparedUpload = {
  id: string;
  name: string;
  path: string;
  token: string;
  contentType?: string;
};

export type UploadedDocumentResult = {
  id: string;
};

export async function uploadDocumentsDirect({
  files,
  collectionId,
  tagIds,
  onProgress,
}: {
  files: File[];
  collectionId: string;
  tagIds: string[];
  onProgress?: (file: File, progress: number) => void;
}) {
  let preparedUploads: PreparedUpload[] = [];

  try {
    const prepareResponse = await fetch("/api/documents/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        collection_id: collectionId,
        tag_ids: tagIds,
        files: files.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
        })),
      }),
    });
    const prepareBody = await prepareResponse.json().catch(() => null);

    if (!prepareResponse.ok) {
      const error = new Error(prepareBody?.error ?? "Could not prepare upload.");
      Object.assign(error, {
        code: prepareBody?.code,
        used: prepareBody?.used,
        limit: prepareBody?.limit,
      });
      throw error;
    }

    preparedUploads = (prepareBody?.uploads ?? []) as PreparedUpload[];
    if (preparedUploads.length !== files.length) {
      throw new Error("Upload preparation returned an unexpected file count.");
    }

    const supabase = createClient();
    await Promise.all(
      files.map(async (file, index) => {
        const upload = preparedUploads[index];
        onProgress?.(file, 45);
        const { error } = await supabase.storage
          .from("documents")
          .uploadToSignedUrl(upload.path, upload.token, file, {
            contentType: upload.contentType || file.type || undefined,
          });

        if (error) {
          throw new Error(`Storage upload failed for ${file.name}: ${error.message}`);
        }

        onProgress?.(file, 60);
      }),
    );

    const completeResponse = await fetch("/api/documents/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document_ids: preparedUploads.map((upload) => upload.id),
        tag_ids: tagIds,
      }),
    });
    const completeBody = await completeResponse.json().catch(() => null);
    if (!completeResponse.ok) {
      throw new Error(completeBody?.error ?? "Could not complete upload.");
    }

    return (completeBody.documents ?? []) as UploadedDocumentResult[];
  } catch (error) {
    if (preparedUploads.length) {
      void fetch("/api/documents/upload-url", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_ids: preparedUploads.map((upload) => upload.id),
        }),
      });
    }
    throw error;
  }
}
