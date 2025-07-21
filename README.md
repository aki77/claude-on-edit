# Claude on Edit

A post-tool-use hook for Claude Code that automatically runs commands on files when they are edited by Claude.

## Overview

`claude-on-edit` is a tool that integrates with Claude Code's hook system to automatically execute commands on files after they are modified by Write, Edit, or MultiEdit tools. This enables automatic formatting, linting, testing, and other file processing tasks whenever Claude makes changes to your codebase.

## Features

- 🎯 **Pattern-based configuration**: Define commands for specific file patterns using glob syntax
- 🚀 **Multiple execution modes**: Run commands concurrently or sequentially
- 📝 **Comprehensive logging**: Verbose output for debugging and monitoring
- 🛡️ **Error handling**: Blocks unsafe operations when commands fail
- 🔧 **Flexible command configuration**: Support for simple commands, arrays, and functions
- 🏃‍♂️ **Dry run mode**: Test your configuration without executing commands

## Installation

```bash
npm install -g @aki77/claude-on-edit
```

## Quick Start

### 1. Create Configuration File

Run the init command to create a configuration template:

```bash
npx @aki77/claude-on-edit init
```

This will create a `.claude/claude-on-edit.config.js` file in your project with common configuration examples.

### 2. Get Help

View usage instructions and examples:

```bash
npx @aki77/claude-on-edit --help
```

## Configuration

Create a `.claude/claude-on-edit.config.js` file in your project:

```javascript
export default {
  // Format TypeScript/JavaScript files
  "**/*.{ts,js,tsx,jsx}": "npm run format",

  // Run linter on specific patterns
  "src/**/*.ts": ["npm run lint", "npm run typecheck"],

  // Dynamic commands using functions
  "**/*.json": (files) => files.map(file => `jsonlint ${file}`),

  // Multiple commands for Python files
  "**/*.py": [
    "black .",
    "ruff check --fix",
    "mypy"
  ]
};
```

## CLI Commands

### Help Command

Display usage information and examples:

```bash
npx @aki77/claude-on-edit --help
# or
npx @aki77/claude-on-edit -h
```

### Init Command

Create a configuration file template:

```bash
npx @aki77/claude-on-edit init
```

If a configuration file already exists, you'll be prompted to confirm overwriting it.

## Usage

### As a Post-Tool-Use Hook

Add the following to your Claude Code settings:

```json
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
```

## Configuration Options

The configuration file supports three types of command definitions:

### 1. Simple String Commands

```javascript
export default {
  "**/*.ts": "npm run format"
};
```

### 2. Array of Commands

```javascript
export default {
  "**/*.ts": [
    "npm run lint",
    "npm run typecheck",
    "npm run test"
  ]
};
```

### 3. Function-based Commands

```javascript
export default {
  "**/*.css": (files) => files.map(file => `stylelint --fix ${file}`),
  "**/*.md": (files) => `markdownlint ${files.join(' ')}`
};
```

## Environment Variables

Configure behavior using environment variables:

- `CLAUDE_ON_EDIT_VERBOSE=true`: Enable verbose logging
- `CLAUDE_ON_EDIT_CONCURRENT=false`: Disable concurrent command execution
- `CLAUDE_ON_EDIT_DRY_RUN=true`: Enable dry run mode (show commands without executing)

## Supported Tools

The hook responds to the following Claude Code tools:

- `Write`: When a new file is created or an existing file is overwritten
- `Edit`: When a file is modified using find-and-replace
- `MultiEdit`: When multiple edits are made to a single file

## Error Handling

When commands fail, the hook will:

1. Log detailed error information
2. Block the operation to prevent unsafe changes
3. Return a structured error response to Claude Code

Example error output:

```json
{
  "decision": "block",
  "reason": "Command failed: npm run lint",
  "details": {
    "command": "npm run lint",
    "stderr": "Error: Linting failed with 3 errors",
    "exitCode": 1
  }
}
```

## Examples

### Basic Formatting Setup

```javascript
export default {
  "**/*.{js,ts,jsx,tsx}": "prettier --write",
  "**/*.css": "stylelint --fix",
  "**/*.md": "markdownlint --fix"
};
```

### Advanced Multi-step Processing

```javascript
export default {
  "src/**/*.ts": [
    "eslint --fix",
    "tsc --noEmit",
    "jest --findRelatedTests --passWithNoTests"
  ],
  "**/*.json": (files) => [
    ...files.map(file => `jsonlint ${file}`),
    "npm run validate-schema"
  ]
};
```

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Related Projects

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) - The official Claude CLI tool
- [Anthropic Claude](https://anthropic.com/claude) - The AI assistant that powers Claude Code
