import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { LlmCompleteOptions, LlmProvider } from './llm-provider.interface';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

@Injectable()
export class GroqProvider implements LlmProvider {
  private readonly client = new OpenAI({
    baseURL: GROQ_BASE_URL,
    apiKey: process.env.GROQ_API_KEY,
  });

  async complete(
    systemPrompt: string,
    userPrompt: string,
    options: LlmCompleteOptions = {},
  ): Promise<string> {
    const model = process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b';

    const response = await this.client.chat.completions.create({
      model,
      max_completion_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    return response.choices[0].message.content ?? '';
  }
}
