import { randomUUID } from 'crypto';

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  ts: string;
  requestId?: string;
  [key: string]: unknown;
}

function write(entry: LogEntry) {
  const line = JSON.stringify(entry);
  if (entry.level === 'error') console.error(line);
  else if (entry.level === 'warn') console.warn(line);
  else console.log(line);
}

export function logger(...args: any[]) {
  write({ level: 'info', ts: new Date().toISOString(), message: args.map(a => (typeof a === 'string' ? a : safeStringify(a))).join(' ') });
}

logger.info = (...args: any[]) => write({ level: 'info', ts: new Date().toISOString(), message: args.map(a => (typeof a === 'string' ? a : safeStringify(a))).join(' ') });
logger.warn = (...args: any[]) => write({ level: 'warn', ts: new Date().toISOString(), message: args.map(a => (typeof a === 'string' ? a : safeStringify(a))).join(' ') });
logger.error = (...args: any[]) => write({ level: 'error', ts: new Date().toISOString(), message: args.map(a => (typeof a === 'string' ? a : safeStringify(a))).join(' ') });
logger.debug = (...args: any[]) => {
  if (process.env.DEBUG) write({ level: 'debug', ts: new Date().toISOString(), message: args.map(a => (typeof a === 'string' ? a : safeStringify(a))).join(' ') });
};

// Logs a structured request line with a request id for correlation.
logger.request = (entry: { requestId: string; method: string; path: string; status: number; durationMs: number }) => {
  write({ level: 'info', ts: new Date().toISOString(), ...entry });
};

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function newRequestId(): string {
  return randomUUID();
}