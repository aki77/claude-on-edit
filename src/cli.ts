#!/usr/bin/env node
import { postToolUseHook } from './index.js';
import type { PostToolUseInput } from './types.js';
import { initConfig } from './init.js';

function showHelp() {
  console.log(`
Claude on Edit
A post-tool-use hook for Claude Code that automatically runs commands on files when they are edited.

USAGE:
  npx @aki77/claude-on-edit [COMMAND] [OPTIONS]

COMMANDS:
  init                     Create a configuration file template
  --help, -h              Show this help message

HOOK USAGE:
  When used as a post-tool-use hook, the tool accepts JSON input via stdin or as an argument.

CONFIGURATION:
  Create a claude-on-edit.config.js file in your project root:

  export default {
    // Format TypeScript/JavaScript files
    "**/*.{ts,js,tsx,jsx}": "npm run format",

    // Run multiple commands
    "src/**/*.ts": [
      "npm run lint",
      "npm run typecheck"
    ],

    // Dynamic commands using functions
    "**/*.json": (files) => files.map(file => \`jsonlint \${file}\`)
  };

CLAUDE CODE INTEGRATION:
  Add to your Claude Code settings:

  {
    "hooks": {
      "PostToolUse": [
        {
          "matcher": "Write|Edit|MultiEdit",
          "hooks": [
            {
              "type": "command",
              "command": "npx -y @aki77/claude-on-edit"
            }
          ]
        }
      ]
    }
  }

ENVIRONMENT VARIABLES:
  CLAUDE_ON_EDIT_VERBOSE=true     Enable verbose logging
  CLAUDE_ON_EDIT_CONCURRENT=false Disable concurrent execution
  CLAUDE_ON_EDIT_DRY_RUN=true     Enable dry run mode

For more information, visit: https://github.com/aki77/claude-on-edit
`);
}

async function main() {
  try {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
      showHelp();
      return;
    }

    if (args[0] === 'init') {
      await initConfig();
      return;
    }

    if (args[0] && !args[0].startsWith('{') && args[0] !== '--help' && args[0] !== '-h') {
      console.error(`Error: Unknown command '${args[0]}'`);
      console.error('Available commands: init, --help');
      console.error('Use --help for more information.');
      process.exit(1);
    }

    let input: PostToolUseInput;

    if (process.stdin.isTTY) {
      const inputStr = args[0];
      if (!inputStr) {
        console.error('Error: No input provided. Expected JSON input as argument or via stdin.');
        console.error('Use --help for usage information.');
        process.exit(1);
      }
      input = JSON.parse(inputStr);
    } else {
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk);
      }
      const inputStr = Buffer.concat(chunks).toString('utf-8');
      input = JSON.parse(inputStr);
    }

    await postToolUseHook(input);
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error('Error: Invalid JSON input');
    } else {
      console.error('Error:', error instanceof Error ? error.message : String(error));
    }
    process.exit(1);
  }
}

main();
