/**
 * Evolution API v2 wrapper
 * Docs: https://doc.evolution-api.com
 *
 * Covers: Instance Management, Messaging, Group Management
 */

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface EvolutionInstance {
  name: string;
  connectionStatus: 'open' | 'close' | 'connecting';
  ownerJid?: string;
  number?: string;
  profileName?: string;
  profilePicUrl?: string;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

export interface SendTextOptions {
  delay?: number;       // Typing simulation delay in ms (2000-5000ms for realism)
  linkPreview?: boolean;
}

export interface SendTextResponse {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  messageTimestamp: number;
  status: string;
}

export interface SendMediaOptions {
  caption?: string;
  fileName?: string;
  delay?: number;
  mimetype?: string;
}

export interface GroupInfo {
  id: string;
  subject: string;
  description?: string;
  owner?: string;
  creation?: number;
  participants?: ParticipantInfo[];
}

export interface InviteCodeResponse {
  inviteUrl: string;
  inviteCode: string;
}

export interface ParticipantInfo {
  id: string;
  admin: string | null;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function baseUrl(url: string) {
  return url.replace(/\/$/, '');
}

function mapStatus(evStatus: string): ConnectionStatus {
  if (evStatus === 'open') return 'connected';
  if (evStatus === 'connecting') return 'connecting';
  return 'disconnected';
}

async function throwIfNotOk(res: Response, context: string): Promise<void> {
  if (!res.ok) {
    let body = '';
    try { body = await res.text(); } catch { /* ignore */ }
    throw new Error(`${context} failed (${res.status}): ${body}`);
  }
}

// ─── Instance Management ─────────────────────────────────────────────────────

/** Fetch all instances visible to this API key */
export async function fetchInstances(
  apiUrl: string,
  apiKey: string,
): Promise<EvolutionInstance[]> {
  const res = await fetch(`${baseUrl(apiUrl)}/instance/fetchInstances`, {
    headers: { apikey: apiKey },
  });
  await throwIfNotOk(res, 'fetchInstances');
  return res.json();
}

/** Get connection state for a single instance */
export async function getConnectionState(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
): Promise<{ status: ConnectionStatus; instanceExists: boolean }> {
  const res = await fetch(
    `${baseUrl(apiUrl)}/instance/connectionState/${encodeURIComponent(instanceName)}`,
    { headers: { apikey: apiKey } },
  );
  if (res.status === 404) {
    // Instance doesn't exist in Evolution API
    return { status: 'disconnected', instanceExists: false };
  }
  await throwIfNotOk(res, 'getConnectionState');
  const data = await res.json();
  // v2 returns { instance: { state: 'open' | 'close' } }
  const state: string = data?.instance?.state ?? data?.state ?? 'close';
  return { status: mapStatus(state), instanceExists: true };
}

/** Restart a running instance */
export async function restartInstance(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
): Promise<void> {
  const res = await fetch(
    `${baseUrl(apiUrl)}/instance/restart/${encodeURIComponent(instanceName)}`,
    {
      method: 'PUT',
      headers: { apikey: apiKey },
    },
  );
  if (res.status === 404) {
    throw new Error(`Instância "${instanceName}" não encontrada na Evolution API. Verifique se o nome está correto ou crie a instância primeiro.`);
  }
  await throwIfNotOk(res, 'restartInstance');
}

/** Get QR code / connection data for an instance */
export async function connectInstance(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
): Promise<{ base64?: string; code?: string; pairingCode?: string }> {
  const res = await fetch(
    `${baseUrl(apiUrl)}/instance/connect/${encodeURIComponent(instanceName)}`,
    { headers: { apikey: apiKey } },
  );
  await throwIfNotOk(res, 'connectInstance');
  return res.json();
}

// ─── Messaging ───────────────────────────────────────────────────────────────

/**
 * Send a text message via a given instance.
 * Returns the message key (remoteJid, fromMe, id) for delivery tracking.
 */
export async function sendText(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
  number: string,
  text: string,
  options?: SendTextOptions,
): Promise<SendTextResponse> {
  const res = await fetch(
    `${baseUrl(apiUrl)}/message/sendText/${encodeURIComponent(instanceName)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify({
        number,
        text,
        ...(options?.delay !== undefined && { delay: options.delay }),
        ...(options?.linkPreview !== undefined && { linkPreview: options.linkPreview }),
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`sendText failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  // Normalize response — Evolution v2 returns different shapes
  return {
    key: data?.key ?? { remoteJid: `${number}@s.whatsapp.net`, fromMe: true, id: '' },
    messageTimestamp: data?.messageTimestamp ?? Math.floor(Date.now() / 1000),
    status: data?.status ?? 'PENDING',
  };
}

/** Send a media message (image, video, audio, document) via a given instance */
export async function sendMedia(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
  number: string,
  mediatype: 'image' | 'video' | 'audio' | 'document',
  mediaUrl: string,
  options?: SendMediaOptions,
): Promise<SendTextResponse> {
  const res = await fetch(
    `${baseUrl(apiUrl)}/message/sendMedia/${encodeURIComponent(instanceName)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify({
        number,
        mediatype,
        media: mediaUrl,
        ...(options?.caption !== undefined && { caption: options.caption }),
        ...(options?.fileName !== undefined && { fileName: options.fileName }),
        ...(options?.delay !== undefined && { delay: options.delay }),
        ...(options?.mimetype !== undefined && { mimetype: options.mimetype }),
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`sendMedia failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return {
    key: data?.key ?? { remoteJid: `${number}@s.whatsapp.net`, fromMe: true, id: '' },
    messageTimestamp: data?.messageTimestamp ?? Math.floor(Date.now() / 1000),
    status: data?.status ?? 'PENDING',
  };
}

// ─── Group Management ────────────────────────────────────────────────────────

/** Create a new WhatsApp group */
export async function createGroup(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
  subject: string,
  description?: string,
  participants?: string[],
): Promise<{ id: string } & Partial<GroupInfo>> {
  const res = await fetch(
    `${baseUrl(apiUrl)}/group/create/${encodeURIComponent(instanceName)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify({
        subject,
        ...(description !== undefined && { description }),
        ...(participants !== undefined && { participants }),
      }),
    },
  );
  await throwIfNotOk(res, 'createGroup');
  return res.json();
}

/** Get the invite code/URL for a group */
export async function getInviteCode(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
  groupJid: string,
): Promise<InviteCodeResponse> {
  const res = await fetch(
    `${baseUrl(apiUrl)}/group/inviteCode/${encodeURIComponent(instanceName)}?groupJid=${encodeURIComponent(groupJid)}`,
    { headers: { apikey: apiKey } },
  );
  await throwIfNotOk(res, 'getInviteCode');
  return res.json();
}

/** Revoke the invite code for a group (generates a new one) */
export async function revokeInviteCode(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
  groupJid: string,
): Promise<InviteCodeResponse> {
  const res = await fetch(
    `${baseUrl(apiUrl)}/group/revokeInviteCode/${encodeURIComponent(instanceName)}?groupJid=${encodeURIComponent(groupJid)}`,
    {
      method: 'PUT',
      headers: { apikey: apiKey },
    },
  );
  await throwIfNotOk(res, 'revokeInviteCode');
  return res.json();
}

/** Fetch participants of a group */
export async function fetchGroupParticipants(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
  groupJid: string,
): Promise<{ participants: ParticipantInfo[] }> {
  const res = await fetch(
    `${baseUrl(apiUrl)}/group/participants/${encodeURIComponent(instanceName)}?groupJid=${encodeURIComponent(groupJid)}`,
    { headers: { apikey: apiKey } },
  );
  await throwIfNotOk(res, 'fetchGroupParticipants');
  return res.json();
}

/** Add, remove, promote, or demote participants in a group */
export async function updateParticipant(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
  groupJid: string,
  action: 'add' | 'remove' | 'promote' | 'demote',
  participants: string[],
): Promise<unknown> {
  const res = await fetch(
    `${baseUrl(apiUrl)}/group/updateParticipant/${encodeURIComponent(instanceName)}?groupJid=${encodeURIComponent(groupJid)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify({ action, participants }),
    },
  );
  await throwIfNotOk(res, 'updateParticipant');
  return res.json();
}

/** Fetch all groups for an instance */
export async function fetchAllGroups(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
  getParticipants?: boolean,
): Promise<GroupInfo[]> {
  const params = getParticipants !== undefined ? `?getParticipants=${getParticipants}` : '';
  const res = await fetch(
    `${baseUrl(apiUrl)}/group/fetchAllGroups/${encodeURIComponent(instanceName)}${params}`,
    { headers: { apikey: apiKey } },
  );
  await throwIfNotOk(res, 'fetchAllGroups');
  return res.json();
}

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Test connectivity — returns { ok, message } */
export async function testConnection(
  apiUrl: string,
  apiKey: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const instances = await fetchInstances(apiUrl, apiKey);
    return {
      ok: true,
      message: `Conectado! ${instances.length} instância(s) encontrada(s).`,
    };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}
