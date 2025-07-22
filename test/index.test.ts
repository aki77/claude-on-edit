import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { postToolUseHook } from '../src/index.js';
import { PostToolUseInput } from '../src/types.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testCwd = path.resolve(__dirname, '../../test');

describe('postToolUseHook', () => {
  let originalConsoleLog: typeof console.log;
  let originalConsoleError: typeof console.error;
  let originalProcessExit: typeof process.exit;
  let consoleOutput: string[] = [];
  let consoleErrors: string[] = [];

  beforeEach(() => {
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    originalProcessExit = process.exit;
    
    consoleOutput = [];
    consoleErrors = [];

    console.log = (...args: any[]) => {
      consoleOutput.push(args.join(' '));
    };

    console.error = (...args: any[]) => {
      consoleErrors.push(args.join(' '));
    };

    process.exit = ((code?: number) => {
      throw new Error(`Process exit with code ${code}`);
    }) as any;
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    process.exit = originalProcessExit;
  });

  it('should process file when tool_response has type: "update"', async () => {
    const input: PostToolUseInput = {
      session_id: "test-session-123",
      transcript_path: "/path/to/transcript.jsonl",
      cwd: testCwd,
      hook_event_name: "PostToolUse",
      tool_name: "Write",
      tool_input: {
        file_path: "/test/sample.txt",
        content: "test content"
      },
      tool_response: {
        type: "update",
        filePath: "/test/sample.txt",
        content: "test content"
      }
    };

    try {
      await postToolUseHook(input);
    } catch (error) {
      // Ignore process.exit errors in tests
    }
    
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.log('Console output:', consoleOutput);
    console.log('Console errors:', consoleErrors);
    
    assert.ok(consoleOutput.some(line => line.includes('Processing file:')));
    assert.ok(consoleOutput.some(line => line.includes('Processing completed')));
  });

  it('should process file when tool_response has success: true', async () => {
    const input: PostToolUseInput = {
      session_id: "test-session",
      transcript_path: "/test/path",
      cwd: testCwd,
      hook_event_name: "PostToolUse",
      tool_name: "Edit",
      tool_input: {
        file_path: "/test/sample.txt"
      },
      tool_response: {
        success: true
      }
    };

    try {
      await postToolUseHook(input);
    } catch (error) {
      // Ignore process.exit errors in tests
    }
    
    assert.ok(consoleOutput.some(line => line.includes('Processing file:')));
    assert.ok(consoleOutput.some(line => line.includes('Processing completed')));
  });

  it('should skip processing when tool_response has neither type: "update" nor success: true', async () => {
    const input: PostToolUseInput = {
      session_id: "test-session",
      transcript_path: "/test/path",
      cwd: testCwd,
      hook_event_name: "PostToolUse",
      tool_name: "Write",
      tool_input: {
        file_path: "/test/sample.txt"
      },
      tool_response: {
        error: "some error"
      }
    };

    await postToolUseHook(input);
    
    assert.strictEqual(consoleOutput.length, 0);
    assert.strictEqual(consoleErrors.length, 0);
  });

  it('should skip processing when tool_input has no file_path', async () => {
    const input: PostToolUseInput = {
      session_id: "test-session",
      transcript_path: "/test/path",
      cwd: testCwd,
      hook_event_name: "PostToolUse",
      tool_name: "Write",
      tool_input: {
        content: "test"
      },
      tool_response: {
        success: true
      }
    };

    await postToolUseHook(input);
    
    assert.strictEqual(consoleOutput.length, 0);
    assert.strictEqual(consoleErrors.length, 0);
  });

  it('should skip processing for unsupported tools', async () => {
    const input: PostToolUseInput = {
      session_id: "test-session",
      transcript_path: "/test/path",
      cwd: testCwd,
      hook_event_name: "PostToolUse",
      tool_name: "UnsupportedTool",
      tool_input: {
        file_path: "/test/sample.txt"
      },
      tool_response: {
        success: true
      }
    };

    await postToolUseHook(input);
    
    assert.strictEqual(consoleOutput.length, 0);
    assert.strictEqual(consoleErrors.length, 0);
  });

  it('should handle actual JSON from claude.txt', async () => {
    const actualInput: PostToolUseInput = {
      "session_id": "actual-session-456",
      "transcript_path": "/path/to/actual/transcript.jsonl",
      "cwd": testCwd,
      "hook_event_name": "PostToolUse",
      "tool_name": "Write",
      "tool_input": {
        "file_path": "/test/sample.erb",
        "content": "<div class=\"mb-4\">\n  <%= render TitleComponent.new.with_content('Test Title')          %>\n</div>\n\n<%= render 'form', model: @model, item: @item %>"
      },
      "tool_response": {
        "type": "update",
        "filePath": "/test/sample.erb",
        "content": "<div class=\"mb-4\">\n  <%= render TitleComponent.new.with_content('Test Title')          %>\n</div>\n\n<%= render 'form', model: @model, item: @item %>",
        "structuredPatch": [{
          "oldStart": 2,
          "oldLines": 4,
          "newStart": 2,
          "newLines": 4,
          "lines": [
            "   <%= render TitleComponent.new.with_content('Test Title')          %>",
            " </div>",
            " ",
            "-<%= render 'form', model: @model, item: @item %>",
            "+<%= render 'form', model: @model, item: @item %>",
            "\\ No newline at end of file"
          ]
        }]
      }
    };

    try {
      await postToolUseHook(actualInput);
    } catch (error) {
      // Ignore process.exit errors in tests
    }
    
    assert.ok(consoleOutput.some(line => line.includes('Processing file:')));
    assert.ok(consoleOutput.some(line => line.includes('Processing completed')));
  });
});