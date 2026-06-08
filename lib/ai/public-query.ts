import { getLLMProvider } from "@/lib/ai/factory";
import { stripAiDisclaimer } from "@/lib/ai/disclaimer";
import type { QueryResult } from "@/lib/ai/pipeline/query";
import { HELPEXAI_PLATFORM_KNOWLEDGE, isHelpexAIPlatformQuestion } from "@/lib/ai/knowledge/helpexai-platform";

const SYSTEM_PROMPT = `You are HelpexAI, a precise document analysis assistant.
Answer only from the supplied document text. If the answer is not present, say so clearly.
Do not invent facts. Keep answers concise and cite the document name when useful.`;

export async function queryPublicDocument(question: string, document: { id: string; name: string; text: string }): Promise<QueryResult> {
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

  const context = document.text.slice(0, 30_000);
  const prompt = `DOCUMENT: "${document.name}"\n${context}\n\nUSER QUESTION: ${question}\n\nAnswer only from the document above.`;
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
