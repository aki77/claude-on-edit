import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Config, ConfigLoaderOptions } from '../types.js';

const CONFIG_FILE_NAMES = ['.claude/claude-on-edit.config.js', '.claude/claude-on-edit.config.mjs'];
const PACKAGE_JSON = 'package.json';

export async function loadConfig(
  cwd: string,
  options: ConfigLoaderOptions = {},
): Promise<Config | null> {
  const searchDir = options.cwd || cwd;

  for (const fileName of CONFIG_FILE_NAMES) {
    const configPath = path.join(searchDir, fileName);
    const configFromFile = await loadConfigFile(configPath);
    if (configFromFile) {
      return configFromFile;
    }
  }

  const packageJsonPath = path.join(searchDir, PACKAGE_JSON);
  const configFromPackageJson = await loadPackageJsonConfig(packageJsonPath);
  if (configFromPackageJson) {
    return configFromPackageJson;
  }

  if (options.searchParent && searchDir !== path.dirname(searchDir)) {
    return loadConfig(path.dirname(searchDir), options);
  }

  return null;
}

async function loadConfigFile(configPath: string): Promise<Config | null> {
  try {
    await fs.access(configPath);
    const fileUrl = pathToFileURL(configPath).href;
    const module = await import(fileUrl);
    return module.default || module;
  } catch (_error) {
    return null;
  }
}

async function loadPackageJsonConfig(packageJsonPath: string): Promise<Config | null> {
  try {
    const content = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(content);
    return packageJson['claude-on-edit'] || null;
  } catch (_error) {
    return null;
  }
}

export function validateConfig(config: unknown): config is Config {
  if (!config || typeof config !== 'object') {
    return false;
  }

  for (const [pattern, commands] of Object.entries(config)) {
    if (typeof pattern !== 'string') {
      return false;
    }

    if (
      typeof commands !== 'string' &&
      !Array.isArray(commands) &&
      typeof commands !== 'function'
    ) {
      return false;
    }

    if (Array.isArray(commands)) {
      for (const command of commands) {
        if (typeof command !== 'string') {
          return false;
        }
      }
    }
  }

  return true;
}
