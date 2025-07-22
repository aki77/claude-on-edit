import { loadConfig } from './config/loader.js';
import { FileProcessor } from './processor.js';
import type { ClaudeOnEditOptions, HookErrorOutput, PostToolUseInput } from './types.js';

export async function postToolUseHook(input: PostToolUseInput): Promise<void> {
  const { cwd, tool_input, tool_response, tool_name } = input;

  // Check if the tool response indicates success
  // Support both 'success: true' and 'type: "update"' patterns
  const isSuccess = tool_response?.['success'] === true || 
                    tool_response?.['type'] === 'update' ||
                    tool_response?.['filePath'] !== undefined;
  
  if (!isSuccess) {
    return;
  }

  const filePath = tool_input?.['file_path'];

  if (!filePath) {
    return;
  }

  const supportedTools = ['Write', 'Edit', 'MultiEdit'];
  if (!supportedTools.includes(tool_name)) {
    return;
  }

  try {
    const config = await loadConfig(cwd);

    if (!config || Object.keys(config).length === 0) {
      return;
    }

    const options: ClaudeOnEditOptions = {
      verbose: process.env['CLAUDE_ON_EDIT_VERBOSE'] === 'true',
      concurrent: process.env['CLAUDE_ON_EDIT_CONCURRENT'] !== 'false',
      dryRun: process.env['CLAUDE_ON_EDIT_DRY_RUN'] === 'true',
    };

    const processor = new FileProcessor(config, options);

    console.log(`🎨 Processing file: ${filePath}`);
    const errors = await processor.processFile(filePath, cwd);

    if (errors.length > 0) {
      const errorOutput: HookErrorOutput = {
        decision: 'block',
        reason: `Command failed: ${errors.map((e) => e.command).join(', ')}`,
        details:
          errors.length === 1
            ? {
                command: errors[0]!.command,
                stderr: errors[0]!.stderr,
                stdout: errors[0]!.stdout,
                exitCode: errors[0]!.exitCode,
              }
            : undefined,
      };

      console.error(JSON.stringify(errorOutput, null, 2));
      process.exit(2);
    }

    console.log('✅ Processing completed');
  } catch (error) {
    const errorOutput: HookErrorOutput = {
      decision: 'block',
      reason: `Processing failed: ${error instanceof Error ? error.message : String(error)}`,
    };

    console.error(JSON.stringify(errorOutput, null, 2));
    process.exit(2);
  }
}

async function main() {
  try {
    const input: PostToolUseInput = JSON.parse(process.argv[2] || '{}');
    await postToolUseHook(input);
  } catch (error) {
    console.error('Failed to parse hook input:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
