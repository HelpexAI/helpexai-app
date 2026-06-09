import { getLLMProvider } from "@/lib/ai/factory";
import { stripAiDisclaimer } from "@/lib/ai/disclaimer";
import type { QueryResult } from "@/lib/ai/pipeline/query";
import { HELPEXAI_PLATFORM_KNOWLEDGE, isHelpexAIPlatformQuestion } from "@/lib/ai/knowledge/helpexai-platform";
import { formatWebContext, searchWeb } from "@/lib/ai/web-search";

const SYSTEM_PROMPT = `You are HelpexAI, a precise document analysis assistant.
Treat the supplied document as authoritative for document facts.
Follow the user prompt's External Research permission exactly. When it is disabled, do not add outside facts or estimates.
Do not invent facts or sources. Keep answers concise, distinguish document evidence from external context, and cite the document name when useful.`;

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

  const context = document.text.slice(0, 30_000);
  const webContext = externalResearchEnabled ? formatWebContext(await searchWeb(question).catch(() => [])) : "";
  const prompt = `DOCUMENT: "${document.name}"
${context}

${webContext ? `LIVE WEB RESEARCH:\n${webContext}\n\n` : ""}
USER QUESTION: ${question}

Treat the document as authoritative for document facts. ${externalResearchEnabled ? "Use live web research and clearly labeled outside knowledge for relevant context, with Markdown links to web sources." : "Answer only from the document. If it cannot support the answer, state what is missing and suggest turning on **External Research**."}`;
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
