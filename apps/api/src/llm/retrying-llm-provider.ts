import { Logger } from '@nestjs/common';
import { LlmCompleteOptions, LlmProvider } from './llm-provider.interface';

const DEFAULT_MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;

interface RateLimitError {
  status?: number;
  headers?: { get(name: string): string | null } | null;
}

// 1:1 aus ai-trip-planer/apps/api/src/llm/retrying-llm-provider.ts übernommen -
// die Backoff-Logik hängt nur vom (hier vereinfachten) LlmProvider-Interface
// ab, nicht vom Tool-Calling-Teil, der hier fehlt.
export function computeBackoffDelayMs(
  attempt: number,
  retryAfterHeader?: string | null,
): number {
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);
    if (!Number.isNaN(seconds) && seconds >= 0) {
      return seconds * 1000;
    }
  }
  const exponential = BASE_DELAY_MS * 2 ** attempt;
  const jitter = Math.random() * BASE_DELAY_MS;
  return Math.min(exponential + jitter, MAX_DELAY_MS);
}

function isRateLimitError(error: unknown): error is RateLimitError {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as RateLimitError).status === 429
  );
}

export class RetryingLlmProvider implements LlmProvider {
  private readonly logger = new Logger(RetryingLlmProvider.name);

  constructor(
    private readonly inner: LlmProvider,
    private readonly maxRetries: number = DEFAULT_MAX_RETRIES,
    private readonly sleep: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms)),
  ) {}

  async complete(
    systemPrompt: string,
    userPrompt: string,
    options?: LlmCompleteOptions,
  ): Promise<string> {
    let attempt = 0;
    for (;;) {
      try {
        return await this.inner.complete(systemPrompt, userPrompt, options);
      } catch (error) {
        if (!isRateLimitError(error) || attempt >= this.maxRetries) {
          throw error;
        }
        const retryAfter = error.headers?.get('retry-after') ?? null;
        const delay = computeBackoffDelayMs(attempt, retryAfter);
        this.logger.warn(
          `Rate-Limit (429) erhalten, Versuch ${attempt + 1}/${this.maxRetries}, warte ${delay}ms`,
        );
        await this.sleep(delay);
        attempt++;
      }
    }
  }
}
