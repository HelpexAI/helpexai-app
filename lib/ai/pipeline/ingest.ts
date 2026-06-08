import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { getEmbeddingProvider, getVectorDBProvider } from '../factory'
import { generateNamespace } from '@/lib/utils'
import { nanoid } from 'nanoid'

const CHUNK_SIZE = 1000
const CHUNK_OVERLAP = 200

export interface IngestOptions {
  userId: string
  categorySlug: string
  docId: string
  docName: string
  fileBuffer: Buffer
  fileType: 'pdf' | 'docx' | 'txt'
}

export interface IngestResult {
  chunkCount: number
}

export interface ExtractedDocumentPage {
  pageNumber: number | null
  text: string
}

export async function extractDocumentPages(buffer: Buffer, fileType: string): Promise<ExtractedDocumentPage[]> {
  if (fileType === 'pdf') {
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: buffer })
    try {
      const data = await parser.getText()
      return data.pages.map(page => ({ pageNumber: page.num, text: page.text }))
    } finally {
      await parser.destroy()
    }
  }
  return [{ pageNumber: null, text: await extractDocumentText(buffer, fileType) }]
}

export async function extractDocumentText(buffer: Buffer, fileType: string): Promise<string> {
  if (fileType === 'pdf') {
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: buffer })
    try {
      const data = await parser.getText()
      return data.text
    } finally {
      await parser.destroy()
    }
  }

  if (fileType === 'docx') {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  // txt
  return buffer.toString('utf-8')
}

export async function ingestDocument(options: IngestOptions): Promise<IngestResult> {
  const { userId, categorySlug, docId, docName, fileBuffer, fileType } = options

  // 1. Extract text
  const pages = await extractDocumentPages(fileBuffer, fileType)
  if (!pages.some(page => page.text.trim())) {
    throw new Error('No text content could be extracted from this document')
  }

  // 2. Split into chunks
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  })
  const pageChunks = await Promise.all(pages.map(async page => ({
    pageNumber: page.pageNumber,
    chunks: await splitter.splitText(page.text),
  })))
  const chunks = pageChunks.flatMap(page =>
    page.chunks.map(text => ({ text, pageNumber: page.pageNumber })),
  )

  if (chunks.length === 0) {
    throw new Error('Document produced no text chunks after splitting')
  }

  // 3. Embed all chunks
  const embeddingProvider = getEmbeddingProvider()
  const vectors = await embeddingProvider.embedBatch(chunks.map(chunk => chunk.text))

  // 4. Prepare Qdrant points
  const points = chunks.map((chunk, index) => ({
    id: nanoid(),
    vector: vectors[index],
    payload: {
      docId,
      docName,
      chunkIndex: index,
      pageNumber: chunk.pageNumber,
      text: chunk.text,
    },
  }))

  // 5. Upsert to Qdrant
  const namespace = generateNamespace(userId, categorySlug)
  const vectorDB = getVectorDBProvider()
  await vectorDB.upsert(namespace, points)

  return { chunkCount: chunks.length }
}

export async function deleteDocumentVectors(
  userId: string,
  categorySlug: string,
  docId: string
): Promise<void> {
  const namespace = generateNamespace(userId, categorySlug)
  const vectorDB = getVectorDBProvider()
  await vectorDB.deleteByFilter(namespace, {
    key: 'payload.docId',
    match: { value: docId },
  })
}
