export interface PostToolUseInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  hook_event_name: 'PostToolUse';
  tool_name: string;
  tool_input: Record<string, any>;
  tool_response: Record<string, any>;
}

export interface WriteToolInput {
  file_path: string;
  content: string;
}

export interface EditToolInput {
  file_path: string;
  old_string: string;
  new_string: string;
  replace_all?: boolean;
}

export interface MultiEditToolInput {
  file_path: string;
  edits: Array<{
    old_string: string;
    new_string: string;
    replace_all?: boolean;
  }>;
}

export interface ToolResponse {
  success: boolean;
  filePath?: string;
  [key: string]: any;
}

export interface ClaudeOnEditOptions {
  verbose?: boolean;
  concurrent?: boolean;
  dryRun?: boolean;
}

export interface CommandRunnerOptions extends ClaudeOnEditOptions {
  stdio?: 'inherit' | 'pipe';
  cwd?: string;
}

export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
  code?: number;
}

export interface ProcessingTask {
  pattern: string;
  command: string;
  file: string;
  isFunctionGenerated?: boolean;
}

export type CommandFunction = (file: string) => string | string[];

export type CommandConfig = string | string[] | CommandFunction;

export interface Config {
  [pattern: string]: CommandConfig;
}

export interface ConfigLoaderOptions {
  cwd?: string;
  searchParent?: boolean;
}

export interface HookErrorOutput {
  decision: 'block';
  reason: string;
  details?: {
    command: string;
    stderr: string;
    stdout?: string;
    exitCode?: number;
  };
}

export interface ProcessingError {
  command: string;
  stderr: string;
  stdout?: string;
  exitCode?: number;
  pattern: string;
}
