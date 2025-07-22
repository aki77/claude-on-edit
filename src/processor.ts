import { minimatch } from 'minimatch';
import { relative } from 'node:path';
import { CommandRunner } from './commandRunner.js';
import type { ClaudeOnEditOptions, Config, ProcessingError, ProcessingTask } from './types.js';

export class FileProcessor {
  private commandRunner: CommandRunner;

  constructor(
    private config: Config,
    private options: ClaudeOnEditOptions = {},
  ) {
    this.commandRunner = new CommandRunner(options);
  }

  async processFile(filePath: string, workingDir: string): Promise<ProcessingError[]> {
    const tasks = this.createTasks([filePath], workingDir);

    if (tasks.length === 0) {
      if (this.options.verbose) {
        console.log(`No matching patterns for file: ${filePath}`);
      }
      return [];
    }

    if (this.options.concurrent) {
      return await this.runConcurrent(tasks, workingDir);
    } else {
      return await this.runSequential(tasks, workingDir);
    }
  }

  async processFiles(files: string[], workingDir: string): Promise<ProcessingError[]> {
    const tasks = this.createTasks(files, workingDir);

    if (tasks.length === 0) {
      if (this.options.verbose) {
        console.log('No matching patterns for any files');
      }
      return [];
    }

    if (this.options.concurrent) {
      return await this.runConcurrent(tasks, workingDir);
    } else {
      return await this.runSequential(tasks, workingDir);
    }
  }

  private createTasks(files: string[], workingDir?: string): ProcessingTask[] {
    const tasks: ProcessingTask[] = [];

    for (const [pattern, commands] of Object.entries(this.config)) {
      if (typeof pattern !== 'string') continue;

      const matchedFiles = files.filter((file) => {
        // Convert absolute path to relative path if workingDir is provided
        const pathToMatch = workingDir && file.startsWith('/') 
          ? relative(workingDir, file) 
          : file;
        
        return minimatch(pathToMatch, pattern, { dot: true });
      });

      if (matchedFiles.length === 0) continue;

      const commandList = this.normalizeCommands(commands, matchedFiles);

      for (const command of commandList) {
        tasks.push({ pattern, command, files: matchedFiles });
      }
    }

    return tasks;
  }

  private normalizeCommands(commands: unknown, files: string[]): string[] {
    if (typeof commands === 'string') return [commands];
    if (Array.isArray(commands)) return commands as string[];
    if (typeof commands === 'function') {
      const result = commands(files);
      return Array.isArray(result) ? result : [result];
    }
    throw new Error(`Invalid command configuration: ${typeof commands}`);
  }

  private async runSequential(
    tasks: ProcessingTask[],
    workingDir: string,
  ): Promise<ProcessingError[]> {
    const errors: ProcessingError[] = [];

    for (const task of tasks) {
      if (this.options.verbose) {
        console.log(`📋 Pattern: ${task.pattern}`);
      }

      const result = await this.commandRunner.executeCommand(task.command, task.files, workingDir);

      if (!result.success) {
        console.error(`❌ Command failed: ${task.command}`);
        if (result.error) {
          console.error(`   Error: ${result.error}`);
        }
        if (result.stderr) {
          console.error(`   Stderr: ${result.stderr}`);
        }

        errors.push({
          command: task.command,
          stderr: result.stderr,
          stdout: result.stdout,
          exitCode: result.code,
          pattern: task.pattern,
        });

        if (process.env['CLAUDE_ON_EDIT_FAIL_ON_ERROR'] === 'true') {
          throw new Error(`Command failed: ${task.command}`);
        }
      } else if (this.options.verbose) {
        console.log(`✅ Command succeeded: ${task.command}`);
      }
    }

    return errors;
  }

  private async runConcurrent(
    tasks: ProcessingTask[],
    workingDir: string,
  ): Promise<ProcessingError[]> {
    const results = await Promise.all(
      tasks.map(async (task) => {
        if (this.options.verbose) {
          console.log(`📋 Pattern: ${task.pattern}`);
        }

        const result = await this.commandRunner.executeCommand(
          task.command,
          task.files,
          workingDir,
        );
        return { task, result };
      }),
    );

    const errors: ProcessingError[] = [];

    for (const { task, result } of results) {
      if (!result.success) {
        console.error(`❌ Command failed: ${task.command}`);
        if (result.error) {
          console.error(`   Error: ${result.error}`);
        }
        if (result.stderr) {
          console.error(`   Stderr: ${result.stderr}`);
        }

        errors.push({
          command: task.command,
          stderr: result.stderr,
          stdout: result.stdout,
          exitCode: result.code,
          pattern: task.pattern,
        });

        if (process.env['CLAUDE_ON_EDIT_FAIL_ON_ERROR'] === 'true') {
          throw new Error(`Command failed: ${task.command}`);
        }
      } else if (this.options.verbose) {
        console.log(`✅ Command succeeded: ${task.command}`);
      }
    }

    return errors;
  }
}
