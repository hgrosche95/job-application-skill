import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { draftCoverLetter, listApplications, matchJobPosting } from './api-client.js';
import type { DraftCoverLetterInput, MatchJobPostingInput } from './api-client.js';

function errorContent(action: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: 'text' as const, text: `Fehler beim ${action}: ${message}` }],
    isError: true,
  };
}

function jsonContent(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

const MatchJobPostingSchema = z.object({
  postingText: z.string().min(1).describe('Volltext der Stellenanzeige'),
  resumeText: z.string().min(1).describe('Volltext des Lebenslaufs'),
});

const DraftCoverLetterSchema = z.object({
  postingText: z.string().min(1).describe('Volltext der Stellenanzeige'),
  resumeText: z.string().min(1).describe('Volltext des Lebenslaufs'),
  applicantName: z.string().min(1).describe('Name des Bewerbers für die Grußformel'),
  previousDraft: z
    .string()
    .optional()
    .describe('Bisheriger Entwurf, falls dies eine Überarbeitung ist'),
  feedback: z
    .string()
    .optional()
    .describe('Gewünschte Änderungen am bisherigen Entwurf'),
});

/**
 * Registriert alle drei Bewerbungshelfer-Tools auf einer McpServer-Instanz -
 * von beiden Transporten (stdio in index.ts, HTTP in http-server.ts)
 * genutzt, damit die Tool-Definitionen nicht zweimal gepflegt werden müssen.
 * Anders als im trip-planner-Vorbild gibt es hier keine destruktive Aktion
 * (die REST-API hat keinen Lösch-Endpunkt), daher auch kein bewusst
 * weggelassenes Tool.
 */
export function registerTools(server: McpServer): void {
  server.registerTool(
    'match_job_posting',
    {
      description:
        'Gleicht eine Stellenanzeige mit einem Lebenslauf ab: extrahiert Firma, Stellentitel und die wichtigsten Anforderungen, ordnet jeder Anforderung eine passende Erfahrung aus dem Lebenslauf zu und benennt Lücken ehrlich statt sie zu erfinden.',
      inputSchema: MatchJobPostingSchema,
    },
    async (input) => {
      try {
        return jsonContent(await matchJobPosting(input as MatchJobPostingInput));
      } catch (error) {
        return errorContent('Abgleichen der Stellenanzeige', error);
      }
    },
  );

  server.registerTool(
    'draft_cover_letter',
    {
      description:
        'Erstellt einen Anschreiben-Entwurf aus Stellenanzeige und Lebenslauf. Mit previousDraft+feedback lässt sich ein bestehender Entwurf gezielt überarbeiten statt neu zu generieren.',
      inputSchema: DraftCoverLetterSchema,
    },
    async (input) => {
      try {
        return jsonContent(await draftCoverLetter(input as DraftCoverLetterInput));
      } catch (error) {
        return errorContent('Entwerfen des Anschreibens', error);
      }
    },
  );

  server.registerTool(
    'list_applications',
    {
      description: 'Listet alle bereits angelegten Bewerbungsordner auf.',
      inputSchema: z.object({}),
    },
    async () => {
      try {
        return jsonContent(await listApplications());
      } catch (error) {
        return errorContent('Auflisten der Bewerbungen', error);
      }
    },
  );
}
