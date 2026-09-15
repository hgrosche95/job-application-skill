import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { startActiveObservation } from '@langfuse/tracing';
import { LLM_PROVIDER } from '../llm/llm-provider.interface';
import type { LlmProvider } from '../llm/llm-provider.interface';

interface DraftCoverLetterInput {
  postingText: string;
  resumeText: string;
  applicantName: string;
  previousDraft?: string;
  feedback?: string;
}

// 1:1 aus bewerbungshelfer/resources/anschreiben_vorlage.md übersetzt, plus
// eine explizite Anti-Halluzinations-Regel oben an: in Tests hat die LLM
// sonst frei erfundene Zahlen ("10.000 Nutzer", "99,8% Verfügbarkeit") und
// nicht belegte Technologien ins Anschreiben geschrieben - die "wo
// vorhanden"-Einschränkung aus der Vorlage allein reichte nicht.
const SYSTEM_PROMPT = `Du schreibst den Entwurf eines Anschreibens auf Basis einer Stellenanzeige und eines Lebenslaufs.

WICHTIGSTE REGEL, wichtiger als alle anderen Vorgaben: Bevor du schreibst, lies den Lebenslauf genau und merke dir NUR die dort wortwörtlich genannten Technologien, Firmen, Zeiträume und Zahlen. Nenne im Anschreiben KEINE einzige Technologie, Firma, Zahl oder Kennzahl, die nicht wortwörtlich im Lebenslauf-Text vorkommt - auch nicht als naheliegende Ergänzung oder Vermutung. Ist eine Anforderung aus der Anzeige im Lebenslauf nicht belegt, erwähne diese Anforderung im Anschreiben gar nicht, statt sie mit einer erfundenen oder vermuteten Erfahrung zu verknüpfen.

Aufbau:
1. Anrede - namentlich, wenn in der Anzeige genannt; sonst neutral ("Sehr geehrte Damen und Herren" nur wenn nichts Konkreteres möglich ist).
2. Einstieg (1-2 Sätze) - konkreter Aufhänger: welche Stelle, warum diese Firma. Kein "Hiermit bewerbe ich mich auf...".
3. Hauptteil (2 Absätze) - pro Absatz eine Anforderung aus der Anzeige mit einer konkreten Erfahrung oder einem Projekt aus dem Lebenslauf verknüpfen; Ergebnisse/Zahlen einbauen, wo vorhanden.
4. Schluss (1-2 Sätze) - Bezug zu Team/Zusammenarbeit, Gesprächswunsch.
5. Grußformel + Name des Bewerbers.

Stil: 250-400 Wörter, aktiv statt passiv, jeder Satz muss zu dieser konkreten Stelle passen. Ton an die Anzeige anpassen (Startup vs. Konzern, Du vs. Sie).

Vermeiden: Floskeln ("Teamplayer", "hoch motiviert", "Leidenschaft"), Wiederholung des Lebenslaufs in Fließtext, ungeprüfte Übertreibungen ohne Beleg im Lebenslauf.

Antworte AUSSCHLIESSLICH mit dem fertigen Anschreiben-Text (kein Markdown, keine Erklärung davor/danach).`;

// Bekannte Grenze (Stand: getestet mit Groq/openai-oss-120b, temperature 0):
// Technologie-Erfindungen (z.B. nicht im Lebenslauf erwähnte Datenbanken)
// verhindert die Regel oben zuverlässig, plausibel klingende erfundene
// Kennzahlen ("30% schnellere Antwortzeiten") aber nicht immer. Prompt-
// Engineering allein löst das nicht vollständig - dafür der Validierungs-
// Loop unten (Phase 5, Muster aus agentic-rogue-like/encounter_agent.py:
// generieren -> deterministisch validieren -> bei Verstoß mit dem
// konkreten Fehler im Prompt erneut, gedeckelt).

const MAX_ATTEMPTS = 3;
const MIN_WORDS = 250;
const MAX_WORDS = 400;
// 1:1 die "Vermeiden"-Liste aus dem System-Prompt oben - die LLM hält sich
// nicht zuverlässig selbst daran (siehe Phase 1d), das hier ist der
// deterministische Nachprüf-Schritt dafür.
const FORBIDDEN_PHRASES = ['teamplayer', 'hoch motiviert', 'leidenschaft'];

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** null = valide. Sonst der Grund, der als Korrektur-Hinweis in den nächsten Prompt fließt. */
function validateDraft(text: string): string | null {
  const wordCount = countWords(text);
  if (wordCount < MIN_WORDS || wordCount > MAX_WORDS) {
    return `Der Text hat ${wordCount} Wörter, gefordert sind ${MIN_WORDS}-${MAX_WORDS}.`;
  }
  const lower = text.toLowerCase();
  const foundPhrase = FORBIDDEN_PHRASES.find((phrase) => lower.includes(phrase));
  if (foundPhrase) {
    return `Der Text enthält die zu vermeidende Floskel "${foundPhrase}".`;
  }
  return null;
}

export interface DraftCoverLetterResult {
  text: string;
  validationPassed: boolean;
  attempts: number;
}

@Injectable()
export class CoverLettersService {
  constructor(@Inject(LLM_PROVIDER) private readonly llm: LlmProvider) {}

  async draft(input: DraftCoverLetterInput): Promise<DraftCoverLetterResult> {
    if (
      !input?.postingText?.trim() ||
      !input?.resumeText?.trim() ||
      !input?.applicantName?.trim()
    ) {
      throw new BadRequestException(
        "'postingText', 'resumeText' und 'applicantName' sind erforderlich",
      );
    }

    const baseUserPrompt = input.previousDraft
      ? `Stellenanzeige:\n${input.postingText}\n\nLebenslauf:\n${input.resumeText}\n\nName des Bewerbers: ${input.applicantName}\n\nBisheriger Entwurf:\n${input.previousDraft}\n\nGewünschte Änderungen:\n${input.feedback ?? '(keine Angabe, allgemein verbessern)'}\n\nÜberarbeite den Entwurf entsprechend.`
      : `Stellenanzeige:\n${input.postingText}\n\nLebenslauf:\n${input.resumeText}\n\nName des Bewerbers: ${input.applicantName}`;

    // Getraced wird nur die Form des Laufs (Modell, Token-Zahlen, Wortzahl,
    // Anzahl Versuche) - niemals der tatsächliche Anzeigen-, Lebenslauf-
    // oder Anschreiben-Text, siehe Begründung in job-postings.service.ts.
    return startActiveObservation('draft-cover-letter', async (span) => {
      let text = '';
      let validationError: string | null = null;
      let attempt = 0;

      for (attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const userPrompt = validationError
          ? `${baseUserPrompt}\n\nDein vorheriger Entwurf wurde abgelehnt: ${validationError} Erstelle einen neuen Entwurf, der das behebt.`
          : baseUserPrompt;

        text = await startActiveObservation(
          `generate-draft-attempt-${attempt}`,
          async (generation) => {
            const result = await this.llm.complete(SYSTEM_PROMPT, userPrompt, {
              temperature: 0,
              maxTokens: 1024,
            });
            const attemptText = result.text.trim();
            generation.update({
              model: result.model,
              usageDetails: {
                input: result.usage.inputTokens,
                output: result.usage.outputTokens,
              },
              metadata: { wordCount: countWords(attemptText) },
            });
            return attemptText;
          },
          { asType: 'generation' },
        );

        validationError = validateDraft(text);
        if (!validationError) break;
      }

      span.update({
        metadata: {
          isRevision: Boolean(input.previousDraft),
          attempts: attempt > MAX_ATTEMPTS ? MAX_ATTEMPTS : attempt,
          validationPassed: validationError === null,
          finalValidationError: validationError,
        },
      });

      return {
        text,
        validationPassed: validationError === null,
        attempts: attempt > MAX_ATTEMPTS ? MAX_ATTEMPTS : attempt,
      };
    });
  }
}
