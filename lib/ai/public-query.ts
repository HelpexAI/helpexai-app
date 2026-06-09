import { getLLMProvider } from "@/lib/ai/factory";
import { stripAiDisclaimer } from "@/lib/ai/disclaimer";
import type { QueryResult } from "@/lib/ai/pipeline/query";
import { HELPEXAI_PLATFORM_KNOWLEDGE, isHelpexAIPlatformQuestion } from "@/lib/ai/knowledge/helpexai-platform";
import { formatWebContext, searchWeb } from "@/lib/ai/web-search";

const SYSTEM_PROMPT = `You are HelpexAI, a precise document analysis assistant.
Treat the supplied document as authoritative for document facts.
Follow the user prompt's External Research permission exactly. When it is disabled, do not add outside facts or estimates.
Do not invent facts or sources. Keep answers concise, distinguish document evidence from external context, and cite the document name when useful.`;

const UNREADABLE_DOCUMENT_ANSWER =
  "I could not find enough readable text in this document to answer reliably. The file may be malformed, password-protected, image-only, or use text encoding that could not be extracted. Sorry for the inconvenience. Please try an OCR-processed or text-based version, or upload another document.";

export async function queryPublicDocument(question: string, document: { id: string; name: string; text: string }, externalResearchEnabled = false): Promise<QueryResult> {
  if (isHelpexAIPlatformQuestion(question)) {
    const prompt = `HELPEXAI PLATFORM KNOWLEDGE:\n${HELPEXAI_PLATFORM_KNOWLEDGE}\n\nUSER QUESTION: ${question}\n\nAnswer using only the HelpexAI platform knowledge above. Be helpful, accurate, and concise. Include a relevant HelpexAI link when useful.`;
    const answer = stripAiDisclaimer(await getLLMProvider().complete(
      prompt,
      "You are the official HelpexAI product assistant. Never invent product facts or mix uploaded-document content into HelpexAI product answers.",
    ));
    return {
      answer,
      sources: [],
      answerType: "general_knowledge",
      tokensUsed: Math.ceil(answer.length / 4),
    };
  }

  const context = document.text.trim().slice(0, 30_000);
  if (context.replace(/\s/g, "").length < 20) {
    return {
      answer: UNREADABLE_DOCUMENT_ANSWER,
      sources: [],
      answerType: "document",
      tokensUsed: 0,
    };
  }
  const webContext = externalResearchEnabled ? formatWebContext(await searchWeb(question).catch(() => [])) : "";
  const prompt = `DOCUMENT: "${document.name}"
${context}

${webContext ? `LIVE WEB RESEARCH:\n${webContext}\n\n` : ""}
USER QUESTION: ${question}

Treat the document as authoritative for document facts. ${externalResearchEnabled ? "Use live web research and clearly labeled outside knowledge for relevant context, with Markdown links to web sources." : "Answer only from the document."}
If the document does not contain enough readable evidence to answer, do not guess. Explain that the answer could not be found and that the document may be malformed, unreadable, image-only, or incomplete. Apologize briefly and suggest trying an OCR-processed, text-based, or different document.`;
  const answer = stripAiDisclaimer(await getLLMProvider().complete(prompt, SYSTEM_PROMPT));
  return {
    answer,
    sources: [{
      docId: document.id,
      docName: document.name,
      chunkIndex: 0,
      pageNumber: null,
      excerpt: context.slice(0, 300),
    }],
    answerType: "document",
    tokensUsed: Math.ceil(answer.length / 4),
  };
}
