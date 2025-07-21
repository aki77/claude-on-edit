import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { CommandResult, CommandRunnerOptions } from './types.js';

const execFileAsync = promisify(execFile);

export class CommandRunner {
  private options: Required<CommandRunnerOptions>;

  constructor(options: CommandRunnerOptions = {}) {
    this.options = {
      shell: true,
      stdio: 'inherit',
      cwd: process.cwd(),
      verbose: false,
      concurrent: true,
      dryRun: false,
      ...options,
    };
  }

  async executeCommand(
    command: string,
    files: string[],
    workingDir: string,
  ): Promise<CommandResult> {
    const fullCommand = this.interpolateFiles(command, files);

    if (this.options.verbose) {
      console.log(`🔧 Executing: ${fullCommand}`);
    }

    if (this.options.dryRun) {
      console.log(`[DRY RUN] Would execute: ${fullCommand}`);
      return {
        success: true,
        stdout: '',
        stderr: '',
      };
    }

    try {
      const [cmd, ...args] = this.parseCommand(fullCommand);

      if (!cmd) {
        throw new Error('Empty command');
      }

      const result = await execFileAsync(cmd, args, {
        cwd: workingDir,
        shell: this.options.shell,
        maxBuffer: 1024 * 1024 * 10,
        env: process.env,
      });

      return {
        success: true,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        stdout: error.stdout || '',
        stderr: error.stderr || '',
      };
    }
  }

  private interpolateFiles(command: string, files: string[]): string {
    if (command.includes('{files}')) {
      return command.replace('{files}', files.join(' '));
    }
    return `${command} ${files.join(' ')}`;
  }

  private parseCommand(command: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    let escaped = false;

    for (let i = 0; i < command.length; i++) {
      const char = command[i];

      if (escaped) {
        current += char;
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
        continue;
      }

      if (inQuotes && char === quoteChar) {
        inQuotes = false;
        quoteChar = '';
        continue;
      }

      if (!inQuotes && char === ' ') {
        if (current.length > 0) {
          parts.push(current);
          current = '';
        }
        continue;
      }

      current += char;
    }

    if (current.length > 0) {
      parts.push(current);
    }

    return parts;
  }
}
