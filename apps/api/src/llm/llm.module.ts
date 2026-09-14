import { Module } from '@nestjs/common';
import { LLM_PROVIDER } from './llm-provider.interface';
import { AnthropicProvider } from './anthropic.provider';
import { GroqProvider } from './groq.provider';
import { RetryingLlmProvider } from './retrying-llm-provider';

@Module({
  providers: [
    {
      provide: LLM_PROVIDER,
      // Bewusst mit `new` statt über Nest-DI erzeugt: würden AnthropicProvider
      // und GroqProvider selbst als Provider registriert, würde Nest BEIDE
      // beim Bootstrap instanziieren - beide SDK-Clients verlangen dann
      // sofort einen gültigen API-Key, selbst wenn nur einer genutzt wird
      // (1:1 dasselbe Problem wie in ai-trip-planer/apps/api/src/agent.module.ts).
      useFactory: () => {
        const selected =
          process.env.LLM_PROVIDER === 'anthropic'
            ? new AnthropicProvider()
            : new GroqProvider();
        return new RetryingLlmProvider(selected);
      },
    },
  ],
  exports: [LLM_PROVIDER],
})
export class LlmModule {}
