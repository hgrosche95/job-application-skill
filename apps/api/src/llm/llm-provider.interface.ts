export interface LlmCompleteOptions {
  maxTokens?: number;
  temperature?: number;
}

/**
 * Bewusst schlanker als das chat()-Interface im ai-trip-planer-Vorbild
 * (apps/api/src/llm/llm-provider.interface.ts dort): dieses Projekt braucht
 * kein Tool-Calling, nur einen einzelnen System-/User-Prompt-Aufruf mit
 * Text-Antwort - für match_job_posting und (später) draft_cover_letter
 * reicht das.
 */
export interface LlmProvider {
  complete(
    systemPrompt: string,
    userPrompt: string,
    options?: LlmCompleteOptions,
  ): Promise<string>;
}

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
