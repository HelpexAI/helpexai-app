import { LLMProvider, EmbeddingProvider, VectorDBProvider } from "@/types";
import { OpenAILLMProvider } from "./providers/llm/openai";
import { GroqProvider } from "./providers/llm/groq";
import { OpenAIEmbeddingProvider } from "./providers/embeddings/openai";
import { QdrantProvider } from "./providers/vectordb/qdrant";

let llmInstance: LLMProvider | null = null;
let embeddingInstance: EmbeddingProvider | null = null;
let vectorDBInstance: VectorDBProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (llmInstance) return llmInstance;

  const provider = process.env.LLM_PROVIDER || "groq";

  if (provider === "openai") {
    llmInstance = new OpenAILLMProvider();
  } else {
    llmInstance = new GroqProvider();
  }

  return llmInstance!;
}

export function getEmbeddingProvider(): EmbeddingProvider {
  if (embeddingInstance) return embeddingInstance;

  // Both dev and prod use OpenAI embeddings (Xenova unreliable in serverless)
  embeddingInstance = new OpenAIEmbeddingProvider();

  return embeddingInstance!;
}

export function getVectorDBProvider(): VectorDBProvider {
  if (vectorDBInstance) return vectorDBInstance;
  vectorDBInstance = new QdrantProvider();
  return vectorDBInstance!;
}

// Reset all singletons (useful in tests)
export function resetProviders() {
  llmInstance = null;
  embeddingInstance = null;
  vectorDBInstance = null;
}
