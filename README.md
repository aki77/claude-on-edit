# Claude on Edit

A post-tool-use hook for Claude Code that automatically runs commands on files when they are edited by Claude.

## Overview

`claude-on-edit` is a tool that integrates with Claude Code's hook system to automatically execute commands on files after they are modified by Write, Edit, or MultiEdit tools. This enables automatic formatting, linting, testing, and other file processing tasks whenever Claude makes changes to your codebase.

## Features

- 🚀 **One-command setup**: `init` command automatically configures everything
- 📦 **lint-staged migration**: Automatically detects and converts existing lint-staged configuration
- 🔧 **Claude Code integration**: Automatically sets up PostToolUse hooks in settings.json
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

### 1. Initialize Configuration

Run the init command to set up everything automatically:

```bash
npx @aki77/claude-on-edit init
```

This will:
- Create a `.claude/claude-on-edit.config.js` configuration file
- Automatically detect and migrate existing `lint-staged` configuration from `package.json`
- Set up Claude Code hooks in `.claude/settings.json`
- Configure the PostToolUse hook to run automatically on file edits

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
  "**/*.json": (file) => `jsonlint ${file}`,

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

Create a configuration file template and set up Claude Code hooks:

```bash
npx @aki77/claude-on-edit init
```

The init command will:
- Create `.claude/claude-on-edit.config.js` with a comprehensive configuration template
- Detect existing `lint-staged` configuration in `package.json` and migrate it automatically
- Set up `.claude/settings.json` with the appropriate PostToolUse hook configuration
- Handle existing settings by merging rather than overwriting

If a configuration file already exists, you'll be prompted to confirm overwriting it.

## Usage

### Automatic Setup (Recommended)

After running `npx @aki77/claude-on-edit init`, the tool is automatically configured and ready to use. No manual setup required!

### Manual Setup (Advanced)

If you need to manually configure the PostToolUse hook, add the following to your Claude Code settings (`.claude/settings.json`):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "(Write|Edit|MultiEdit)",
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

The configuration file supports three types of command definitions.

### File Placeholder

You can use `{file}` placeholder in your commands, which will be replaced with the actual file path:

```javascript
export default {
  "**/*.ts": "eslint {file} --fix"
};
```

If the placeholder is not used, the file path will be appended to the command automatically.

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
  "**/*.css": (file) => `stylelint --fix ${file}`,
  "**/*.md": (file) => `markdownlint ${file}`
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
  "**/*.json": (file) => [
    `jsonlint ${file}`,
    "npm run validate-schema"
  ]
};
```

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Related Projects

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) - The official Claude CLI tool
- [Anthropic Claude](https://anthropic.com/claude) - The AI assistant that powers Claude Code
