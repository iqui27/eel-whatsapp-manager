import { AppConfig, Chip } from './config';
import { loadClusters, loadContacts, updateContact } from './contacts';
import { addLog, loadLogs } from './logs';
import { updateChip } from './chips';
import { sendText as evolutionSendText } from './evolution';

interface RunOptions {
  singleChipId?: string;
}

interface SendOutcome {
  target: string;
  success: boolean;
  type: 'chip' | 'contact';
  clusterId?: string;
  error?: string;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function resolveSpintax(input: string): string {
  let output = input;
  const pattern = /\{([^{}]+)\}/g;

  while (/\{[^{}]+\}/.test(output)) {
    output = output.replace(pattern, (_match, options: string) => {
      const variants = options.split('|').map((variant) => variant.trim()).filter(Boolean);
      if (variants.length === 0) {
        return '';
      }
      return pickRandom(variants);
    });
  }

  return output;
}

function isWithinWindow(start?: string, end?: string): boolean {
  if (!start || !end) {
    return true;
  }

  const now = new Date();
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);

  if (Number.isNaN(startHour) || Number.isNaN(startMinute) || Number.isNaN(endHour) || Number.isNaN(endMinute)) {
    return true;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}

function isSameDay(timestamp: string, now = new Date()): boolean {
  const date = new Date(timestamp);
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

async function sendText(config: AppConfig, instanceName: string, number: string, text: string): Promise<void> {
  await evolutionSendText(config.evolutionApiUrl, config.evolutionApiKey, instanceName, number, text);
}

async function warmChipToChip(chip: Chip, target: Chip, config: AppConfig): Promise<SendOutcome> {
  const instanceName = chip.instanceName ?? config.instanceName;
  const text = config.warmingMessage;

  try {
    await sendText(config, instanceName, target.phone, text);
    await addLog({
      chipId: chip.id,
      chipName: chip.name,
      phone: target.phone,
      status: 'success',
      message: text,
      destinationType: 'chip',
      destinationName: target.name,
      sentText: text,
      delayUsedMs: 0,
    });
    return { target: target.phone, success: true, type: 'chip' };
  } catch (error) {
    await addLog({
      chipId: chip.id,
      chipName: chip.name,
      phone: target.phone,
      status: 'error',
      message: String(error),
      destinationType: 'chip',
      destinationName: target.name,
      sentText: text,
      delayUsedMs: 0,
    });
    return { target: target.phone, success: false, type: 'chip', error: String(error) };
  }
}

async function warmChipToContacts(chip: Chip, config: AppConfig): Promise<SendOutcome[]> {
  const chipClusterIds = chip.clusterIds ?? [];
  if (chipClusterIds.length === 0) {
    return [];
  }

  const [clusters, contacts, logs] = await Promise.all([
    loadClusters(),
    loadContacts(),
    loadLogs(),
  ]);

  const enabledContacts = contacts.filter((contact) => contact.enabled);
  const now = new Date();
  const outcomes: SendOutcome[] = [];
  const chipInstanceName = chip.instanceName ?? config.instanceName;
  const processedContacts = new Set<string>();
  const contactSendCounts = new Map(contacts.map((contact) => [contact.id, contact.contactCount ?? 0]));

  const selectedClusters = clusters
    .filter((cluster) => chipClusterIds.includes(cluster.id) && cluster.enabled)
    .sort((a, b) => a.priority - b.priority);

  for (const cluster of selectedClusters) {
    if (!isWithinWindow(cluster.windowStart, cluster.windowEnd)) {
      continue;
    }

    const sentTodayForCluster = logs.filter((log) => (
      log.status === 'success' &&
      log.destinationType === 'contact' &&
      log.clusterId === cluster.id &&
      isSameDay(log.timestamp, now)
    )).length;

    const availableSlots = Math.max(0, (cluster.maxMessagesPerDay ?? 0) - sentTodayForCluster);
    if (availableSlots <= 0) {
      continue;
    }

    const contactsForCluster = enabledContacts.filter((contact) => (
      contact.clusterIds.includes(cluster.id) && !processedContacts.has(contact.id)
    ));
    const selectedContacts = shuffle(contactsForCluster).slice(0, availableSlots);

    for (const contact of selectedContacts) {
      const messagePool = cluster.messages.length > 0 ? cluster.messages : [config.warmingMessage];
      const chosenTemplate = pickRandom(messagePool);
      const renderedText = resolveSpintax(chosenTemplate);

      try {
        await sendText(config, chipInstanceName, contact.phone, renderedText);
        processedContacts.add(contact.id);
        const nextCount = (contactSendCounts.get(contact.id) ?? 0) + 1;
        contactSendCounts.set(contact.id, nextCount);
        await addLog({
          chipId: chip.id,
          chipName: chip.name,
          phone: contact.phone,
          status: 'success',
          message: renderedText,
          destinationType: 'contact',
          destinationName: contact.name,
          clusterId: cluster.id,
          clusterName: cluster.name,
          sentText: renderedText,
          delayUsedMs: 0,
        });
        await updateContact(contact.id, {
          lastContacted: now.toISOString(),
          contactCount: nextCount,
        });
        outcomes.push({ target: contact.phone, success: true, type: 'contact', clusterId: cluster.id });
      } catch (error) {
        await addLog({
          chipId: chip.id,
          chipName: chip.name,
          phone: contact.phone,
          status: 'error',
          message: String(error),
          destinationType: 'contact',
          destinationName: contact.name,
          clusterId: cluster.id,
          clusterName: cluster.name,
          sentText: renderedText,
          delayUsedMs: 0,
        });
        outcomes.push({
          target: contact.phone,
          success: false,
          type: 'contact',
          clusterId: cluster.id,
          error: String(error),
        });
      }
    }
  }

  return outcomes;
}

export async function runWarming(config: AppConfig, chips: Chip[], options?: RunOptions) {
  const enabledChips = chips.filter((chip) => chip.enabled);
  const chipsToWarm = options?.singleChipId
    ? enabledChips.filter((chip) => chip.id === options.singleChipId)
    : enabledChips;

  const results: Array<{ chipId: string; chipName: string; outcomes: SendOutcome[] }> = [];

  for (const chip of chipsToWarm) {
    const outcomes: SendOutcome[] = [];
    const chipTargets = enabledChips.filter((target) => target.id !== chip.id);

    for (const target of chipTargets) {
      const outcome = await warmChipToChip(chip, target, config);
      outcomes.push(outcome);
    }

    const contactOutcomes = await warmChipToContacts(chip, config);
    outcomes.push(...contactOutcomes);

    await updateChip(chip.id, {
      lastWarmed: new Date().toISOString(),
      status: outcomes.some((o) => o.success) ? 'connected' : 'warming',
      warmCount: (chip.warmCount ?? 0) + outcomes.filter((o) => o.success).length,
    });

    results.push({
      chipId: chip.id,
      chipName: chip.name,
      outcomes,
    });
  }

  return results;
}
