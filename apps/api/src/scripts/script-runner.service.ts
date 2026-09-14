import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Ruft die Python-Scripts aus bewerbungshelfer/scripts über execFile auf
 * (Argumente als Array, keine Shell) - Firmenname, Pfade etc. aus
 * Request-Bodies landen so nie in einer Shell-Kommandozeile und können
 * keine Command-Injection auslösen, selbst wenn sie Sonderzeichen
 * enthalten.
 */
@Injectable()
export class ScriptRunnerService {
  private readonly pythonBin = process.env.PYTHON_BIN ?? 'python';

  async run(scriptPath: string, args: string[]): Promise<string> {
    try {
      const { stdout } = await execFileAsync(this.pythonBin, [scriptPath, ...args]);
      return stdout.trim();
    } catch (error) {
      const stderr =
        error && typeof error === 'object' && 'stderr' in error
          ? String((error as { stderr?: unknown }).stderr)
          : '';
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        `Script ${scriptPath} fehlgeschlagen: ${stderr.trim() || message}`,
      );
    }
  }
}
