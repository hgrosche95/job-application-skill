import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { LlmCompleteOptions, LlmCompleteResult, LlmProvider } from './llm-provider.interface';

@Injectable()
export class AnthropicProvider implements LlmProvider {
  private readonly client = new Anthropic();

  async complete(
    systemPrompt: string,
    userPrompt: string,
    options: LlmCompleteOptions = {},
  ): Promise<LlmCompleteResult> {
    const model = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5';

    const response = await this.client.messages.create({
      model,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text',
    );
    return {
      text: textBlock?.text ?? '',
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }
}
