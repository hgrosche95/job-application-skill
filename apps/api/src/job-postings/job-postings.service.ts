import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
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
    const raw = await this.llm.complete(SYSTEM_PROMPT, userPrompt, {
      temperature: 0,
    });

    try {
      return JSON.parse(stripMarkdownFence(raw)) as JobPostingMatch;
    } catch {
      throw new BadGatewayException(
        'LLM-Antwort ließ sich nicht als JSON parsen',
      );
    }
  }
}
