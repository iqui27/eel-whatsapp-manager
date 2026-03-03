export interface AppConfig {
  evolutionApiUrl: string;
  evolutionApiKey: string;
  authPassword: string;
  warmingEnabled: boolean;
  warmingIntervalMinutes: number;
  warmingMessage: string;
  instanceName: string;
  /** ISO timestamp of the last successful cron warming run */
  lastCronRun?: string;
}

export interface Chip {
  id: string;
  name: string;
  phone: string;
  instanceName?: string;
  groupId?: string;
  clusterIds?: string[];
  enabled: boolean;
  lastWarmed?: string;
  status: 'connected' | 'disconnected' | 'warming';
  warmCount?: number;
}

const CONFIG_FILE = '.eel-config.json';

export function getConfigPath(): string {
  return process.cwd();
}

export async function loadConfig(): Promise<AppConfig | null> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const configPath = path.join(getConfigPath(), CONFIG_FILE);
    const data = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function saveConfig(config: AppConfig): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const configPath = path.join(getConfigPath(), CONFIG_FILE);
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

export function validateConfig(config: Partial<AppConfig>): string[] {
  const errors: string[] = [];
  
  if (!config.evolutionApiUrl) {
    errors.push('URL da Evolution API é obrigatória');
  }
  if (!config.evolutionApiKey) {
    errors.push('API Key da Evolution API é obrigatória');
  }
  if (!config.authPassword || config.authPassword.length < 4) {
    errors.push('Senha deve ter pelo menos 4 caracteres');
  }
  
  return errors;
}

export async function configExists(): Promise<boolean> {
  const config = await loadConfig();
  return config !== null;
}
