// Fully offline event/error logger.
// Nothing here ever makes a network request — logs stay on-device
// and can be exported manually from Settings (same mechanism as habit export).
// If you ever want remote crash reporting (e.g. Sentry), that's a network
// dependency you'd add deliberately — hook it into `logEvent` below.

import { LogEntry, LogLevel } from '../types/habit';
import { loadLogs, saveLogs } from './storage';

const MAX_LOGS = 500; // keep storage bounded

let cache: LogEntry[] | null = null;

async function getCache(): Promise<LogEntry[]> {
  if (cache) return cache;
  cache = (await loadLogs<LogEntry[]>()) ?? [];
  return cache;
}

export async function logEvent(
  level: LogLevel,
  message: string,
  meta?: unknown,
): Promise<void> {
  const entries = await getCache();
  const entry: LogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    level,
    message,
    meta: meta !== undefined ? safeStringify(meta) : undefined,
  };
  entries.push(entry);
  if (entries.length > MAX_LOGS) entries.splice(0, entries.length - MAX_LOGS);
  cache = entries;
  await saveLogs(entries);
}

export async function getAllLogs(): Promise<LogEntry[]> {
  return getCache();
}

export async function clearLogs(): Promise<void> {
  cache = [];
  await saveLogs([]);
}

function safeStringify(val: unknown): string {
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
}

// Global JS error handler — catches uncaught exceptions so they
// land in the exportable log instead of just crashing silently.
export function installGlobalErrorHandler(): void {
  const g = global as any;
  const defaultHandler = g.ErrorUtils?.getGlobalHandler?.();
  g.ErrorUtils?.setGlobalHandler?.((error: Error, isFatal?: boolean) => {
    logEvent('error', error.message, {
      stack: error.stack,
      isFatal: !!isFatal,
    });
    defaultHandler?.(error, isFatal);
  });
}
