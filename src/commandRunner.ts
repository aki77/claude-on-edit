import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { CommandResult, CommandRunnerOptions } from './types.js';

const execFileAsync = promisify(execFile);

export class CommandRunner {
  private options: Required<CommandRunnerOptions>;

  constructor(options: CommandRunnerOptions = {}) {
    this.options = {
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
    file: string,
    workingDir: string,
    isFunctionGenerated?: boolean,
  ): Promise<CommandResult> {
    const fullCommand = isFunctionGenerated ? command : this.interpolateFile(command, file);

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
      // Always use shell execution
      const shellPath =
        process.platform === 'win32' ? process.env['ComSpec'] || 'cmd.exe' : '/bin/sh';
      const shellArgs =
        process.platform === 'win32' ? ['/d', '/s', '/c', fullCommand] : ['-c', fullCommand];
      const result = await execFileAsync(shellPath, shellArgs, {
        cwd: workingDir,
        maxBuffer: 1024 * 1024 * 10,
        env: process.env,
      });

      return {
        success: true,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
      };
    } catch (error: unknown) {
      // Type-safe error handling
      const errorObj = error as {
        message?: string;
        code?: number;
        stdout?: string;
        stderr?: string;
      };
      return {
        success: false,
        error: errorObj.message || 'Unknown error',
        code: errorObj.code,
        stdout: errorObj.stdout || '',
        stderr: errorObj.stderr || '',
      };
    }
  }

  private interpolateFile(command: string, file: string): string {
    if (command.includes('{file}')) {
      return command.replace('{file}', file);
    }
    return `${command} ${file}`;
  }
}
