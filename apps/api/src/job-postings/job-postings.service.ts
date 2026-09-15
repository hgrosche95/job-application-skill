import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { startActiveObservation } from '@langfuse/tracing';
import { LLM_PROVIDER } from '../llm/llm-provider.interface';
import type { LlmProvider } from '../llm/llm-provider.interface';

interface MatchJobPostingInput {
  postingText: string;
  resumeText: string;
}

export interface RequirementMatch {
  requirement: string;
  matched: boolean;
  evidence: string | null;
}

export interface JobPostingMatch {
  company: string | null;
  jobTitle: string | null;
  requirements: RequirementMatch[];
  summary: string;
}

const SYSTEM_PROMPT = `Du gleichst eine Stellenanzeige mit einem Lebenslauf ab, wie in Schritt 4 des Bewerbungshelfer-Skills beschrieben.
Extrahiere Firma, Stellentitel und die 3-5 wichtigsten Anforderungen aus der Anzeige.
Ordne jeder Anforderung eine passende Erfahrung aus dem Lebenslauf zu; wo nichts passt, sage das ehrlich statt etwas zu erfinden.
Antworte AUSSCHLIESSLICH mit validem JSON (kein Markdown-Codeblock, kein Fließtext davor/danach) in genau diesem Format:
{"company": string|null, "jobTitle": string|null, "requirements": [{"requirement": string, "matched": boolean, "evidence": string|null}], "summary": string}`;

function stripMarkdownFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : trimmed;
}

@Injectable()
export class JobPostingsService {
  constructor(@Inject(LLM_PROVIDER) private readonly llm: LlmProvider) {}

  async match(input: MatchJobPostingInput): Promise<JobPostingMatch> {
    if (!input?.postingText?.trim() || !input?.resumeText?.trim()) {
      throw new BadRequestException(
        "'postingText' und 'resumeText' sind erforderlich",
      );
    }

    const userPrompt = `Stellenanzeige:\n${input.postingText}\n\nLebenslauf:\n${input.resumeText}`;

    // Getraced wird nur die Form des Laufs (Modell, Token-Zahlen, wie viele
    // Anforderungen erfüllt wurden) - niemals der tatsächliche Anzeigen-
    // oder Lebenslauf-Text, siehe ai-trip-planer-README "Was bewusst nicht
    // getraced wird". Beides sind bei diesem Skill potenziell sensible
    // Bewerbungsdaten, nicht bloß Reisepräferenzen wie im Vorbild.
    return startActiveObservation(
      'match-job-posting',
      async (generation) => {
        const result = await this.llm.complete(SYSTEM_PROMPT, userPrompt, {
          temperature: 0,
        });

        let match: JobPostingMatch;
        try {
          match = JSON.parse(stripMarkdownFence(result.text)) as JobPostingMatch;
        } catch {
          throw new BadGatewayException(
            'LLM-Antwort ließ sich nicht als JSON parsen',
          );
        }

        generation.update({
          model: result.model,
          usageDetails: {
            input: result.usage.inputTokens,
            output: result.usage.outputTokens,
          },
          metadata: {
            requirementsTotal: match.requirements.length,
            requirementsMatched: match.requirements.filter((r) => r.matched).length,
          },
        });

        return match;
      },
      { asType: 'generation' },
    );
  }
}
