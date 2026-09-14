import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { ScriptRunnerService } from '../scripts/script-runner.service';

// apps/api/dist/resumes (bzw. src/resumes im Dev-Betrieb) -> vier Ebenen
// hoch zur Repo-Wurzel, dann rein nach bewerbungshelfer/scripts - dieselbe
// Tiefe in dist wie in src, weil beide zwei Ordner unter apps/api liegen.
const SCRIPTS_DIR = resolve(__dirname, '../../../../bewerbungshelfer/scripts');
const RESUMES_DIR = resolve(process.env.RESUMES_DIR ?? './data/resumes');

function slugify(value: string): string {
  const slug = value.trim().replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '-');
  return slug || 'Lebenslauf';
}

@Injectable()
export class ResumesService {
  constructor(private readonly scriptRunner: ScriptRunnerService) {}

  async create(profile: Record<string, unknown>): Promise<{ path: string }> {
    if (!profile || typeof profile.name !== 'string' || !profile.name.trim()) {
      throw new BadRequestException("'profile.name' ist erforderlich");
    }

    await mkdir(RESUMES_DIR, { recursive: true });

    const dataPath = join(tmpdir(), `lebenslauf-${randomUUID()}.json`);
    await writeFile(dataPath, JSON.stringify(profile), 'utf-8');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = join(RESUMES_DIR, `${slugify(profile.name)}-${timestamp}.pdf`);

    const path = await this.scriptRunner.run(join(SCRIPTS_DIR, 'erstelle_lebenslauf.py'), [
      '--daten',
      dataPath,
      '--ausgabe',
      outputPath,
    ]);
    return { path };
  }
}
