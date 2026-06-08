import { extractDocumentPages } from "@/lib/ai/pipeline/ingest";

function normalizedWords(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(word => word.length > 2);
}

export function findBestCitationPage(
  pages: Array<{ pageNumber: number | null; text: string }>,
  excerpt: string,
  requestedPage?: number | null,
) {
  if (requestedPage) {
    const requested = pages.find(page => page.pageNumber === requestedPage);
    if (requested) return requested;
  }

  const excerptWords = new Set(normalizedWords(excerpt));
  let best = pages[0] ?? { pageNumber: null, text: "" };
  let bestScore = -1;
  for (const page of pages) {
    const pageLower = page.text.toLowerCase();
    if (excerpt.trim().length > 20 && pageLower.includes(excerpt.trim().toLowerCase())) return page;
    const pageWords = new Set(normalizedWords(page.text));
    const score = [...excerptWords].filter(word => pageWords.has(word)).length;
    if (score > bestScore) {
      best = page;
      bestScore = score;
    }
  }
  return best;
}

export async function citationPreviewFromFile(
  buffer: Buffer,
  fileType: string,
  excerpt: string,
  requestedPage?: number | null,
) {
  const pages = await extractDocumentPages(buffer, fileType);
  const match = findBestCitationPage(pages, excerpt, requestedPage);
  return {
    pageNumber: match.pageNumber,
    pageCount: pages.length,
    pageText: match.text,
    excerpt,
  };
}
