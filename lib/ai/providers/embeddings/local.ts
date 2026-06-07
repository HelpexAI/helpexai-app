// Dev fallback: uses OpenAI with same interface
// Xenova doesn't work reliably in Next.js API routes
// Switch EMBEDDING_PROVIDER=openai in both envs and use different API keys/quotas
export { OpenAIEmbeddingProvider as LocalEmbeddingProvider } from './openai'
