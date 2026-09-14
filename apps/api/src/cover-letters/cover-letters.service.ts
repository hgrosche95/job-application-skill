import { BadRequestException, Inject, Injectable } from '@nestjs/common';
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
// Engineering allein löst das nicht vollständig - das ist strukturell genau
// das Problem, für das Phase 5 (LangGraph-Validierungs-Loop) gedacht ist.

@Injectable()
export class CoverLettersService {
  constructor(@Inject(LLM_PROVIDER) private readonly llm: LlmProvider) {}

  async draft(input: DraftCoverLetterInput): Promise<{ text: string }> {
    if (
      !input?.postingText?.trim() ||
      !input?.resumeText?.trim() ||
      !input?.applicantName?.trim()
    ) {
      throw new BadRequestException(
        "'postingText', 'resumeText' und 'applicantName' sind erforderlich",
      );
    }

    const userPrompt = input.previousDraft
      ? `Stellenanzeige:\n${input.postingText}\n\nLebenslauf:\n${input.resumeText}\n\nName des Bewerbers: ${input.applicantName}\n\nBisheriger Entwurf:\n${input.previousDraft}\n\nGewünschte Änderungen:\n${input.feedback ?? '(keine Angabe, allgemein verbessern)'}\n\nÜberarbeite den Entwurf entsprechend.`
      : `Stellenanzeige:\n${input.postingText}\n\nLebenslauf:\n${input.resumeText}\n\nName des Bewerbers: ${input.applicantName}`;

    const text = await this.llm.complete(SYSTEM_PROMPT, userPrompt, {
      temperature: 0,
      maxTokens: 1024,
    });
    return { text: text.trim() };
  }
}
