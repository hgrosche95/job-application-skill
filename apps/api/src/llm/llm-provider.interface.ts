export interface LlmCompleteOptions {
  maxTokens?: number;
  temperature?: number;
}

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface LlmCompleteResult {
  text: string;
  model: string;
  usage: LlmUsage;
}

/**
 * Bewusst schlanker als das chat()-Interface im ai-trip-planer-Vorbild
 * (apps/api/src/llm/llm-provider.interface.ts dort): dieses Projekt braucht
 * kein Tool-Calling, nur einen einzelnen System-/User-Prompt-Aufruf - für
 * match_job_posting und draft_cover_letter reicht das. model/usage sind
 * trotzdem Teil des Ergebnisses (nicht nur der Text) - Phase 4 braucht sie
 * fürs Langfuse-Tracing (siehe job-postings.service.ts/cover-letters.service.ts).
 */
export interface LlmProvider {
  complete(
    systemPrompt: string,
    userPrompt: string,
    options?: LlmCompleteOptions,
  ): Promise<LlmCompleteResult>;
}

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
