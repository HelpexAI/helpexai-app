import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getEmbeddingProvider, getVectorDBProvider } from "../factory";
import { generateNamespace } from "@/lib/utils";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { sanitizeTextForStorage } from "@/lib/text/sanitize";

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

export interface IngestOptions {
  userId: string;
  categorySlug: string;
  docId: string;
  docName: string;
  fileBuffer: Buffer;
  fileType: "pdf" | "docx" | "txt";
  collection?: { name: string; ai_context: string };
  tags?: Array<{ name: string; ai_context: string }>;
}

export interface IngestTextOptions {
  userId: string;
  categorySlug: string;
  docId: string;
  docName: string;
  text: string;
  collection?: {
    name: string;
    ai_context: string;
  };
  tags?: Array<{
    name: string;
    ai_context: string;
  }>;
}
export interface IngestResult {
  chunkCount: number;
}

export interface ExtractedDocumentPage {
  pageNumber: number | null;
  text: string;
}

async function extractPdfPages(
  buffer: Buffer,
): Promise<ExtractedDocumentPage[]> {
  // Vercel does not automatically trace PDF.js' dynamically loaded fake worker.
  // Importing it explicitly both registers the worker globally and bundles it.
  await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({
    data: Uint8Array.from(buffer),
    disableFontFace: true,
    isEvalSupported: false,
    useSystemFonts: false,
    standardFontDataUrl: pathToFileURL(
      join(process.cwd(), "node_modules", "pdfjs-dist", "standard_fonts", "/"),
    ).href,
  });
  const pdf = await task.promise;
  try {
    const pages: ExtractedDocumentPage[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = sanitizeTextForStorage(
        content.items
          .map((item) => ("str" in item ? item.str : ""))
          .filter(Boolean)
          .join(" "),
      );
      pages.push({ pageNumber, text });
      page.cleanup();
    }
    return pages;
  } finally {
    await pdf.destroy();
  }
}

export async function extractDocumentPages(
  buffer: Buffer,
  fileType: string,
): Promise<ExtractedDocumentPage[]> {
  if (fileType === "pdf") {
    return extractPdfPages(buffer);
  }
  return [
    {
      pageNumber: null,
      text: sanitizeTextForStorage(await extractDocumentText(buffer, fileType)),
    },
  ];
}

export async function extractDocumentText(
  buffer: Buffer,
  fileType: string,
): Promise<string> {
  if (fileType === "pdf") {
    return sanitizeTextForStorage(
      (await extractPdfPages(buffer)).map((page) => page.text).join("\n\n"),
    );
  }

  if (fileType === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return sanitizeTextForStorage(result.value);
  }

  // txt
  return sanitizeTextForStorage(buffer.toString("utf-8"));
}

export async function ingestDocument(
  options: IngestOptions,
): Promise<IngestResult> {
  const {
    userId,
    categorySlug,
    docId,
    docName,
    fileBuffer,
    fileType,
    collection,
    tags = [],
  } = options;

  // 1. Extract text
  const pages = await extractDocumentPages(fileBuffer, fileType);
  if (!pages.some((page) => page.text.trim())) {
    throw new Error("No text content could be extracted from this document");
  }

  // 2. Split into chunks
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });
  const pageChunks = await Promise.all(
    pages.map(async (page) => ({
      pageNumber: page.pageNumber,
      chunks: await splitter.splitText(page.text),
    })),
  );
  const chunks = pageChunks.flatMap((page) =>
    page.chunks.map((text) => ({ text, pageNumber: page.pageNumber })),
  );

  if (chunks.length === 0) {
    throw new Error("Document produced no text chunks after splitting");
  }

  // 3. Embed all chunks
  const embeddingProvider = getEmbeddingProvider();
  const metadataContext = [
    collection
      ? `Collection: ${collection.name}. ${collection.ai_context}`
      : "",
    tags.length
      ? `Tags: ${tags.map((tag) => tag.name).join(", ")}. ${tags
          .map((tag) => tag.ai_context)
          .filter(Boolean)
          .join(" ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
  const vectors = await embeddingProvider.embedBatch(
    chunks.map((chunk) =>
      metadataContext ? `${metadataContext}\n\n${chunk.text}` : chunk.text,
    ),
  );
  if (
    vectors.length !== chunks.length ||
    vectors.some(
      (vector) => vector.length !== embeddingProvider.getDimensions(),
    )
  ) {
    throw new Error(
      "Embedding provider returned an unexpected vector count or dimension",
    );
  }

  // 4. Prepare Qdrant points
  const points = chunks.map((chunk, index) => ({
    id: crypto.randomUUID(),
    vector: vectors[index],
    payload: {
      docId,
      docName,
      chunkIndex: index,
      pageNumber: chunk.pageNumber,
      text: chunk.text,
      collectionName: collection?.name,
      collectionContext: collection?.ai_context,
      tags: tags.map((tag) => tag.name),
      tagContext: tags
        .map((tag) => tag.ai_context)
        .filter(Boolean)
        .join(" "),
    },
  }));

  // 5. Upsert to Qdrant
  const namespace = generateNamespace(userId, categorySlug);
  const vectorDB = getVectorDBProvider();
  // Make processing retries idempotent instead of accumulating duplicate chunks.
  await vectorDB.deleteByFilter(namespace, {
    key: "docId",
    match: { value: docId },
  });
  await vectorDB.upsert(namespace, points);

  return { chunkCount: chunks.length };
}

export async function deleteDocumentVectors(
  userId: string,
  categorySlug: string,
  docId: string,
): Promise<void> {
  const namespace = generateNamespace(userId, categorySlug);
  const vectorDB = getVectorDBProvider();
  await vectorDB.deleteByFilter(namespace, {
    key: "docId",
    match: { value: docId },
  });
}

export async function ingestTextDocument(
  options: IngestTextOptions,
): Promise<IngestResult> {
  const {
    userId,
    categorySlug,
    docId,
    docName,
    text,
    collection,
    tags = [],
  } = options;
  const cleanedText = sanitizeTextForStorage(text);
  if (!cleanedText.trim()) {
    throw new Error("No text content was provided for this generated report.");
  }
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });
  const chunks = (await splitter.splitText(cleanedText)).map(
    (chunkText, index) => ({
      text: chunkText,
      chunkIndex: index,
      pageNumber: null,
    }),
  );
  if (!chunks.length) {
    throw new Error("Generated report produced no chunks.");
  }
  const embeddingProvider = getEmbeddingProvider();
  const metadataContext = [
    collection
      ? `Collection: ${collection.name}. ${collection.ai_context}`
      : "",
    tags.length
      ? `Tags: ${tags.map((tag) => tag.name).join(", ")}. ${tags
          .map((tag) => tag.ai_context)
          .filter(Boolean)
          .join(" ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
  const vectors = await embeddingProvider.embedBatch(
    chunks.map((chunk) =>
      metadataContext ? `${metadataContext}\n\n${chunk.text}` : chunk.text,
    ),
  );
  const points = chunks.map((chunk, index) => ({
    id: crypto.randomUUID(),
    vector: vectors[index],
    payload: {
      docId,
      docName,
      chunkIndex: chunk.chunkIndex,
      pageNumber: chunk.pageNumber,
      text: chunk.text,
      collectionName: collection?.name,
      collectionContext: collection?.ai_context,
      tags: tags.map((tag) => tag.name),
      tagContext: tags
        .map((tag) => tag.ai_context)
        .filter(Boolean)
        .join(" "),
      generatedFrom: "report",
    },
  }));
  const namespace = generateNamespace(userId, categorySlug);
  const vectorDB = getVectorDBProvider();
  await vectorDB.deleteByFilter(namespace, {
    key: "docId",
    match: { value: docId },
  });
  await vectorDB.upsert(namespace, points);
  return { chunkCount: chunks.length };
}
