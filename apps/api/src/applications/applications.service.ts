import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { ScriptRunnerService } from '../scripts/script-runner.service';

const SCRIPTS_DIR = resolve(__dirname, '../../../../bewerbungshelfer/scripts');
const APPLICATIONS_DIR = resolve(process.env.APPLICATIONS_DIR ?? './data/Bewerbungen');

interface CreateApplicationInput {
  company: string;
  date?: string;
  resumePaths?: string[];
  attachmentPaths?: string[];
  coverLetterText?: string;
}

export interface ApplicationSummary {
  name: string;
  path: string;
  createdAt: string;
}

@Injectable()
export class ApplicationsService {
  constructor(private readonly scriptRunner: ScriptRunnerService) {}

  async create(input: CreateApplicationInput): Promise<{ path: string }> {
    if (!input?.company?.trim()) {
      throw new BadRequestException("'company' ist erforderlich");
    }

    await mkdir(APPLICATIONS_DIR, { recursive: true });

    const args = ['--firma', input.company, '--basis', APPLICATIONS_DIR];
    if (input.date) args.push('--datum', input.date);
    if (input.resumePaths?.length) args.push('--lebenslauf', ...input.resumePaths);
    if (input.attachmentPaths?.length) args.push('--anlagen', ...input.attachmentPaths);

    const path = await this.scriptRunner.run(
      join(SCRIPTS_DIR, 'setup_bewerbungsordner.py'),
      args,
    );

    if (input.coverLetterText?.trim()) {
      const textPath = join(tmpdir(), `anschreiben-${randomUUID()}.txt`);
      await writeFile(textPath, input.coverLetterText, 'utf-8');
      await this.scriptRunner.run(join(SCRIPTS_DIR, 'erstelle_anschreiben_pdf.py'), [
        '--text',
        textPath,
        '--ausgabe',
        join(path, 'Anschreiben.pdf'),
      ]);
    }

    return { path };
  }

  async list(): Promise<ApplicationSummary[]> {
    await mkdir(APPLICATIONS_DIR, { recursive: true });
    const entries = await readdir(APPLICATIONS_DIR, { withFileTypes: true });
    const folders = entries.filter((entry) => entry.isDirectory());

    return Promise.all(
      folders.map(async (entry) => {
        const fullPath = join(APPLICATIONS_DIR, entry.name);
        const info = await stat(fullPath);
        return { name: entry.name, path: fullPath, createdAt: info.birthtime.toISOString() };
      }),
    );
  }
}
