import { extractDocumentPages, type ExtractedDocumentPage } from "@/lib/ai/pipeline/ingest";
import type { FileType } from "@/types";

const MIN_READABLE_CHARACTERS = 20;

export class DocumentReadabilityError extends Error {
  constructor(
    message: string,
    public readonly code: "IMAGE_ONLY_PDF" | "EMPTY_DOCUMENT" | "ENCRYPTED_OR_INVALID_DOCUMENT",
  ) {
    super(message);
    this.name = "DocumentReadabilityError";
  }
}

export async function validateReadableDocument(buffer: Buffer, fileType: FileType) {
  let pages: ExtractedDocumentPage[];
  try {
    pages = await extractDocumentPages(buffer, fileType);
  } catch {
    throw new DocumentReadabilityError(
      `This ${fileType.toUpperCase()} file could not be read. Upload a valid, non-password-protected document.`,
      "ENCRYPTED_OR_INVALID_DOCUMENT",
    );
  }

  const readableCharacters = pages.reduce(
    (total, page) => total + page.text.replace(/\s/g, "").length,
    0,
  );
  if (readableCharacters < MIN_READABLE_CHARACTERS) {
    if (fileType === "pdf") {
      throw new DocumentReadabilityError(
        "This PDF appears to contain only scanned images. Upload a text-based or OCR-processed PDF so HelpexAI can analyze it.",
        "IMAGE_ONLY_PDF",
      );
    }
    throw new DocumentReadabilityError(
      "No readable text was found in this document. Upload a document containing selectable text.",
      "EMPTY_DOCUMENT",
    );
  }

  return { pages, readableCharacters };
}
