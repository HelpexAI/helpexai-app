import { ChatGroq } from '@langchain/groq'
import { LLMProvider } from '@/types'

export class GroqProvider implements LLMProvider {
  private model: ChatGroq

  constructor() {
    this.model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY!,
      model: 'llama-3.1-70b-versatile',
      temperature: 0.1,
      maxTokens: 1500,
    })
  }

  async complete(prompt: string, systemPrompt: string): Promise<string> {
    const response = await this.model.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ])
    return response.content as string
  }
}
