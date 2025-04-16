/**
 * Centralized logging utility for the Blob Simulation application.
 * Provides consistently prefixed and formatted messages for errors, warnings, and info logs,
 * making it easier to filter and identify simulation-specific console output.
 */

/** Prefix added to all log messages from this utility. @type {string} */
const LOG_PREFIX = "[BlobSim]";

/**
 * Logs an error message to the console (`console.error`).
 * Includes the standard prefix and optional source identifier.
 *
 * @param {string} message - The primary error message to log.
 * @param {any} [context] - Optional additional data or context to log alongside the message (e.g., the error object, relevant state). Defaults to an empty string if not provided.
 * @param {string} [source] - Optional identifier for the source of the error (e.g., function name, component name).
 * @returns {void}
 */
export function logError(message: string, context?: any, source?: string): void {
  const sourceInfo = source ? ` (${source})` : "";
  console.error(`${LOG_PREFIX}${sourceInfo}: ${message}`, context ?? "");
}

/**
 * Logs a warning message to the console (`console.warn`).
 * Includes the standard prefix and optional source identifier.
 *
 * @param {string} message - The primary warning message to log.
 * @param {any} [context] - Optional additional data or context to log alongside the message. Defaults to an empty string if not provided.
 * @param {string} [source] - Optional identifier for the source of the warning.
 * @returns {void}
 */
export function logWarn(message: string, context?: any, source?: string): void {
  const sourceInfo = source ? ` (${source})` : "";
  console.warn(`${LOG_PREFIX}${sourceInfo}: ${message}`, context ?? "");
}

/**
 * Logs an informational message to the console (`console.log`).
 * Useful for tracing execution flow, debugging state, or providing status updates.
 * Includes the standard prefix and optional source identifier.
 *
 * @param {string} message - The informational message to log.
 * @param {any} [context] - Optional additional data or context to log alongside the message. Defaults to an empty string if not provided.
 * @param {string} [source] - Optional identifier for the source of the information.
 * @returns {void}
 */
export function logInfo(message: string, context?: any, source?: string): void {
    const sourceInfo = source ? ` (${source})` : "";
    console.log(`${LOG_PREFIX}${sourceInfo}: ${message}`, context ?? "");
}
