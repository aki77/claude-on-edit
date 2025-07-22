import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createReadlineInterface } from './utils/readline.js';

interface PackageJson {
  'lint-staged'?: Record<string, string | string[]>;
}

const CONFIG_FILE_NAME = '.claude/claude-on-edit.config.js';

const CONFIG_TEMPLATE = `export default {
  // Format TypeScript/JavaScript files with Prettier
  "**/*.{ts,js,tsx,jsx}": "prettier --write",

  // Run ESLint and TypeScript checks on source files
  "src/**/*.{ts,tsx}": [
    "eslint --fix",
    "tsc --noEmit"
  ],

  // Format CSS files
  "**/*.css": "prettier --write",

  // Lint and format HTML files
  "**/*.html": [
    "prettier --write",
    "htmlhint"
  ],

  // Dynamic command example: validate JSON files individually
  "**/*.json": (files) => files.map(file => \`jsonlint \${file}\`),

  // Run tests for test files
  "**/*.test.{ts,js}": "npm test -- --findRelatedTests --passWithNoTests",

  // Format markdown files
  "**/*.md": "prettier --write"
};
`;

async function readPackageJson(): Promise<PackageJson | null> {
  try {
    const packageJsonPath = path.resolve(process.cwd(), 'package.json');
    const content = await fs.readFile(packageJsonPath, 'utf-8');
    return JSON.parse(content) as PackageJson;
  } catch {
    return null;
  }
}

function convertLintStagedToConfig(lintStaged: Record<string, string | string[]>): string {
  const entries = Object.entries(lintStaged).map(([pattern, commands]) => {
    if (Array.isArray(commands)) {
      const commandsStr = commands.map((cmd) => `"${cmd}"`).join(',\n    ');
      return `  "${pattern}": [\n    ${commandsStr}\n  ]`;
    }
    return `  "${pattern}": "${commands}"`;
  });

  return `export default {\n${entries.join(',\n\n')}\n};\n`;
}

export async function initConfig(): Promise<void> {
  const configPath = path.resolve(process.cwd(), CONFIG_FILE_NAME);
  const configDir = path.dirname(configPath);

  try {
    await fs.access(configPath);
    console.log(`Configuration file already exists: ${configPath}`);

    const rl = createReadlineInterface();
    const answer = await new Promise<string>((resolve) => {
      rl.question('Do you want to overwrite it? (y/N): ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('Configuration file creation cancelled.');
      return;
    }
  } catch {
    // File doesn't exist, proceed with creation
  }

  // Check for lint-staged configuration in package.json
  const packageJson = await readPackageJson();
  let configContent = CONFIG_TEMPLATE;
  let usingLintStaged = false;

  if (packageJson?.['lint-staged']) {
    configContent = convertLintStagedToConfig(packageJson['lint-staged']);
    usingLintStaged = true;
  }

  try {
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(configPath, configContent, 'utf-8');
    console.log(`✅ Configuration file created: ${configPath}`);

    if (usingLintStaged) {
      console.log('📦 Found existing lint-staged configuration in package.json');
      console.log('   → Converted and applied to claude-on-edit configuration');
    }

    console.log('\nNext steps:');
    console.log('1. Customize the configuration to match your project needs');
    console.log('2. Add the post-tool-use hook to your Claude Code settings');
    console.log('3. Run `npx @aki77/claude-on-edit --help` for integration instructions');
  } catch (error) {
    console.error(
      'Failed to create configuration file:',
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}
