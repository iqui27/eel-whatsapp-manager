export interface LogEntry {
  id: string;
  timestamp: string;
  chipId: string;
  chipName: string;
  phone: string;
  status: 'success' | 'error';
  message: string;
  destinationType?: 'chip' | 'contact';
  destinationName?: string;
  clusterId?: string;
  clusterName?: string;
  sentText?: string;
  delayUsedMs?: number;
}

const LOGS_FILE = '.eel-logs.json';
const MAX_LOGS = 1000;

export async function loadLogs(): Promise<LogEntry[]> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const { getConfigPath } = await import('./config');
    const logsPath = path.join(getConfigPath(), LOGS_FILE);
    const data = await fs.readFile(logsPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveLogs(logs: LogEntry[]): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const { getConfigPath } = await import('./config');
  const logsPath = path.join(getConfigPath(), LOGS_FILE);
  await fs.writeFile(logsPath, JSON.stringify(logs, null, 2));
}

export async function addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>): Promise<void> {
  const logs = await loadLogs();
  const newEntry: LogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...entry,
  };
  logs.unshift(newEntry); // newest first
  if (logs.length > MAX_LOGS) logs.splice(MAX_LOGS);
  await saveLogs(logs);
}
