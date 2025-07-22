import { loadConfig } from './config/loader.js';
import { FileProcessor } from './processor.js';
import type { ClaudeOnEditOptions, HookErrorOutput, PostToolUseInput } from './types.js';
import { debug } from './utils/debug.js';

export async function postToolUseHook(input: PostToolUseInput): Promise<void> {
  const { cwd, tool_input, tool_response, tool_name } = input;

  // Small delay to ensure file system sync
  await new Promise(resolve => setTimeout(resolve, 100));

  // Debug logging
  debug('postToolUseHook called at:', new Date().toISOString());
  debug('Hook input:', {
    tool_name,
    tool_input,
    tool_response,
    cwd,
  });

  // Check if the tool response indicates success
  // Support both 'success: true' and 'type: "update"' patterns
  const isSuccess =
    tool_response?.['success'] === true ||
    tool_response?.['type'] === 'update' ||
    tool_response?.['filePath'] !== undefined;

  if (!isSuccess) {
    debug('Tool response does not indicate success, skipping');
    return;
  }

  const filePath = tool_input?.['file_path'];

  if (!filePath) {
    debug('No file_path found in tool_input, skipping');
    return;
  }

  const supportedTools = ['Write', 'Edit', 'MultiEdit'];
  if (!supportedTools.includes(tool_name)) {
    debug(`Tool ${tool_name} not in supported tools, skipping`);
    return;
  }

  try {
    const config = await loadConfig(cwd);

    if (!config || Object.keys(config).length === 0) {
      debug('No config found, skipping');
      return;
    }

    const options: ClaudeOnEditOptions = {
      verbose: process.env['CLAUDE_ON_EDIT_VERBOSE'] === 'true',
      concurrent: process.env['CLAUDE_ON_EDIT_CONCURRENT'] !== 'false',
      dryRun: process.env['CLAUDE_ON_EDIT_DRY_RUN'] === 'true',
    };

    const processor = new FileProcessor(config, options);

    // Add timestamp to better understand timing issues
    const startTime = Date.now();
    // Use stdout for normal processing messages
    console.log(`🎨 Processing file: ${filePath} at ${new Date(startTime).toISOString()}`);
    
    // Read file content before processing for debugging
    if (process.env['CLAUDE_ON_EDIT_DEBUG'] === 'true') {
      try {
        const fs = await import('node:fs/promises');
        const contentBefore = await fs.readFile(filePath, 'utf-8');
        debug(`File size before processing: ${contentBefore.length} bytes`);
      } catch (e) {
        debug(`Could not read file before processing: ${e}`);
      }
    }

    const errors = await processor.processFile(filePath, cwd);

    // Read file content after processing for debugging
    if (process.env['CLAUDE_ON_EDIT_DEBUG'] === 'true') {
      try {
        const fs = await import('node:fs/promises');
        const contentAfter = await fs.readFile(filePath, 'utf-8');
        debug(`File size after processing: ${contentAfter.length} bytes`);
        debug(`Processing took ${Date.now() - startTime}ms`);
      } catch (e) {
        debug(`Could not read file after processing: ${e}`);
      }
    }

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

    // Use stdout for completion message
    console.log(`✅ Processing completed at ${new Date().toISOString()}`);
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
