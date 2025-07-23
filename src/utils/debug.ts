/**
 * Debug logging utility for claude-on-edit
 * Only outputs when CLAUDE_ON_EDIT_DEBUG environment variable is set to 'true'
 * Uses console.log to avoid conflicts with Claude Code hooks
 */

/**
 * Logs debug messages when debug mode is enabled
 * @param message - The debug message
 * @param data - Optional data to log
 */
export function debug(message: string, data?: any): void {
  if (process.env['CLAUDE_ON_EDIT_DEBUG'] !== 'true') {
    return;
  }

  if (data !== undefined) {
    console.log(`[DEBUG] ${message}`, data);
  } else {
    console.log(`[DEBUG] ${message}`);
  }
}
