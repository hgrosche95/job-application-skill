import { BadRequestException } from '@nestjs/common';
import { CoverLettersService } from './cover-letters.service';
import type { LlmProvider } from '../llm/llm-provider.interface';

// Erzeugt einen Text mit genau `count` Wörtern.
function words(count: number, word = 'Erfahrung'): string {
  return Array.from({ length: count }, () => word).join(' ');
}

function fakeLlm(...texts: string[]) {
  const complete = jest.fn();
  for (const text of texts) {
    complete.mockResolvedValueOnce({
      text,
      model: 'fake',
      usage: { inputTokens: 1, outputTokens: 1 },
    });
  }
  return { llm: { complete } as unknown as LlmProvider, complete };
}

const input = {
  postingText: 'Backend-Entwickler (m/w/d)',
  resumeText: 'Drei Jahre TypeScript',
  applicantName: 'Max Muster',
};

describe('CoverLettersService: Validierungs-Loop', () => {
  it('nimmt einen gültigen Entwurf im ersten Versuch an', async () => {
    const { llm, complete } = fakeLlm(words(300));

    const result = await new CoverLettersService(llm).draft(input);

    expect(result).toMatchObject({ validationPassed: true, attempts: 1 });
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('versucht es bei zu kurzem Text erneut und nennt den Fehler im Prompt', async () => {
    const { llm, complete } = fakeLlm(words(100), words(300));

    const result = await new CoverLettersService(llm).draft(input);

    expect(result).toMatchObject({ validationPassed: true, attempts: 2 });
    const secondUserPrompt = complete.mock.calls[1][1] as string;
    expect(secondUserPrompt).toContain('Der Text hat 100 Wörter');
  });

  it('lehnt verbotene Floskeln ab, unabhängig von Groß-/Kleinschreibung', async () => {
    const withPhrase = `${words(299)} Teamplayer`;
    const { llm, complete } = fakeLlm(withPhrase, words(300));

    await new CoverLettersService(llm).draft(input);

    const secondUserPrompt = complete.mock.calls[1][1] as string;
    expect(secondUserPrompt).toContain('"teamplayer"');
  });

  it('gibt nach 3 ungültigen Versuchen auf und meldet das', async () => {
    const { llm, complete } = fakeLlm(words(10), words(10), words(10));

    const result = await new CoverLettersService(llm).draft(input);

    expect(result).toMatchObject({ validationPassed: false, attempts: 3 });
    expect(complete).toHaveBeenCalledTimes(3);
  });

  it('verlangt Anzeige, Lebenslauf und Namen', async () => {
    const { llm } = fakeLlm();

    await expect(
      new CoverLettersService(llm).draft({ ...input, resumeText: '  ' }),
    ).rejects.toThrow(BadRequestException);
  });
});
