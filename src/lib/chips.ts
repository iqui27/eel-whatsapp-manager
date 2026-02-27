import { Chip } from './config';

const CHIPS_FILE = '.eel-chips.json';

export async function loadChips(): Promise<Chip[]> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const { getConfigPath } = await import('./config');
    const chipsPath = path.join(getConfigPath(), CHIPS_FILE);
    const data = await fs.readFile(chipsPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveChips(chips: Chip[]): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const { getConfigPath } = await import('./config');
  const chipsPath = path.join(getConfigPath(), CHIPS_FILE);
  await fs.writeFile(chipsPath, JSON.stringify(chips, null, 2));
}

export async function addChip(chip: Chip): Promise<void> {
  const chips = await loadChips();
  chips.push(chip);
  await saveChips(chips);
}

export async function updateChip(id: string, updates: Partial<Chip>): Promise<void> {
  const chips = await loadChips();
  const index = chips.findIndex(c => c.id === id);
  if (index !== -1) {
    chips[index] = { ...chips[index], ...updates };
    await saveChips(chips);
  }
}

export async function deleteChip(id: string): Promise<void> {
  const chips = await loadChips();
  const filtered = chips.filter(c => c.id !== id);
  await saveChips(filtered);
}

export async function getChip(id: string): Promise<Chip | undefined> {
  const chips = await loadChips();
  return chips.find(c => c.id === id);
}
