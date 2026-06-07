import { ChatOpenAI } from '@langchain/openai'
import { LLMProvider } from '@/types'

export class OpenAILLMProvider implements LLMProvider {
  private model: ChatOpenAI

  constructor() {
    this.model = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4.1-mini',
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
