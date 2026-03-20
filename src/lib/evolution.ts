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

// ─── Instance lifecycle ───────────────────────────────────────────────────────

export interface CreateInstanceOptions {
  instanceName: string;
  webhookUrl?: string;      // /api/webhook endpoint of this app
  rejectCall?: boolean;
  alwaysOnline?: boolean;
  readMessages?: boolean;
  // Proxy config — per-instance IP routing for anti-ban protection
  proxyHost?: string;
  proxyPort?: number;
  proxyProtocol?: 'http' | 'https' | 'socks4' | 'socks5';
  proxyUsername?: string;
  proxyPassword?: string;
}

export interface CreateInstanceResult {
  instanceName: string;
  instanceId: string;
  status: string;
  apikey?: string;          // auto-generated key returned by Evolution
}

/**
 * Create a new Evolution API instance.
 * Sets up the webhook and recommended settings in one call.
 */
export async function createInstance(
  apiUrl: string,
  apiKey: string,
  options: CreateInstanceOptions,
): Promise<CreateInstanceResult> {
  const body: Record<string, unknown> = {
    instanceName: options.instanceName,
    integration: 'WHATSAPP-BAILEYS',
    qrcode: false,
    rejectCall: options.rejectCall ?? true,
    msgCall: 'Este número não atende chamadas.',
    alwaysOnline: options.alwaysOnline ?? false,   // false = anti-ban best practice
    readMessages: options.readMessages ?? false,
    readStatus: false,
    syncFullHistory: false,
    groupsIgnore: false,
  };

  if (options.webhookUrl) {
    body.webhook = {
      url: options.webhookUrl,
      byEvents: false,
      base64: false,
      enabled: true,
      events: [
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE',
        'MESSAGES_DELETE',
        'SEND_MESSAGE',
        'CONNECTION_UPDATE',
        'QRCODE_UPDATED',
        'GROUP_PARTICIPANTS_UPDATE',
      ],
    };
  }

  // Proxy config — pass through to Evolution API when configured
  if (options.proxyHost) {
    body.proxy = {
      host: options.proxyHost,
      port: String(options.proxyPort ?? 80),
      protocol: options.proxyProtocol ?? 'http',
      username: options.proxyUsername ?? '',
      password: options.proxyPassword ?? '',
    };
  }

  const res = await fetch(`${baseUrl(apiUrl)}/instance/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: apiKey },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`createInstance failed (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  return {
    instanceName: data?.instance?.instanceName ?? options.instanceName,
    instanceId: data?.instance?.instanceId ?? '',
    status: data?.instance?.status ?? 'created',
    apikey: data?.hash?.apikey,
  };
}

/**
 * Delete an Evolution API instance (disconnects and removes it permanently).
 */
export async function deleteInstance(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
): Promise<void> {
  const res = await fetch(
    `${baseUrl(apiUrl)}/instance/delete/${encodeURIComponent(instanceName)}`,
    { method: 'DELETE', headers: { apikey: apiKey } },
  );
  // 404 = already gone — that's fine
  if (!res.ok && res.status !== 404) {
    const errBody = await res.text();
    throw new Error(`deleteInstance failed (${res.status}): ${errBody}`);
  }
}

export interface UpdateInstanceOptions {
  rejectCall?: boolean;
  alwaysOnline?: boolean;
  readMessages?: boolean;
  // Proxy config — per-instance IP routing for anti-ban protection
  proxyHost?: string;
  proxyPort?: number;
  proxyProtocol?: 'http' | 'https' | 'socks4' | 'socks5';
  proxyUsername?: string;
  proxyPassword?: string;
}

/**
 * Update settings of an existing Evolution API instance.
 * Note: Not all Evolution API versions support runtime proxy update via this endpoint.
 * If proxy update fails (404), proxy changes will only take effect on instance
 * creation or restart. This is a known limitation of the Evolution API.
 */
export async function updateInstanceSettings(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
  options: UpdateInstanceOptions,
): Promise<{ success: boolean; message: string }> {
  const body: Record<string, unknown> = {};

  if (options.rejectCall !== undefined) body.rejectCall = options.rejectCall;
  if (options.alwaysOnline !== undefined) body.alwaysOnline = options.alwaysOnline;
  if (options.readMessages !== undefined) body.readMessages = options.readMessages;

  // Include proxy config if host is set
  if (options.proxyHost) {
    body.proxy = {
      host: options.proxyHost,
      port: String(options.proxyPort ?? 80),
      protocol: options.proxyProtocol ?? 'http',
      username: options.proxyUsername ?? '',
      password: options.proxyPassword ?? '',
    };
  }

  const res = await fetch(
    `${baseUrl(apiUrl)}/instance/update/${encodeURIComponent(instanceName)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', apikey: apiKey },
      body: JSON.stringify(body),
    },
  );

  // 404 = endpoint not available in this Evolution API version
  if (res.status === 404) {
    return {
      success: false,
      message: 'updateInstanceSettings não disponível nesta versão da Evolution API — proxy tomará efeito no próximo restart',
    };
  }

  if (!res.ok) {
    const errBody = await res.text();
    return { success: false, message: `updateInstanceSettings failed (${res.status}): ${errBody}` };
  }

  return { success: true, message: 'Configurações atualizadas' };
}

/**
 * Configure the webhook for an existing instance.
 * Use this when creating instances that don't yet have a webhook set.
 */
export async function setInstanceWebhook(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
  webhookUrl: string,
): Promise<void> {
  const res = await fetch(
    `${baseUrl(apiUrl)}/webhook/set/${encodeURIComponent(instanceName)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: apiKey },
      body: JSON.stringify({
        enabled: true,
        url: webhookUrl,
        webhookByEvents: false,
        webhookBase64: false,
        events: [
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'MESSAGES_DELETE',
          'SEND_MESSAGE',
          'CONNECTION_UPDATE',
          'QRCODE_UPDATED',
          'GROUP_PARTICIPANTS_UPDATE',
        ],
      }),
    },
  );
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`setInstanceWebhook failed (${res.status}): ${errBody}`);
  }
}

/**
 * Read the webhook config for an instance.
 */
export async function findInstanceWebhook(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
): Promise<{ url: string; enabled: boolean; events: string[] } | null> {
  const res = await fetch(
    `${baseUrl(apiUrl)}/webhook/find/${encodeURIComponent(instanceName)}`,
    { headers: { apikey: apiKey } },
  );
  if (res.status === 404) return null;
  if (!res.ok) return null;
  const data = await res.json();
  return {
    url: data?.url ?? '',
    enabled: data?.enabled ?? false,
    events: data?.events ?? [],
  };
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

/** Restart a running instance (may not be available in all Evolution API versions) */
export async function restartInstance(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
): Promise<{ success: boolean; message: string }> {
  const url = `${baseUrl(apiUrl)}/instance/restart/${encodeURIComponent(instanceName)}`;
  
  // Try PUT first (documented endpoint)
  let res = await fetch(url, {
    method: 'PUT',
    headers: { apikey: apiKey },
  });
  
  // If PUT fails with 404, try POST (some versions use POST)
  if (res.status === 404) {
    res = await fetch(url, {
      method: 'POST',
      headers: { apikey: apiKey },
    });
  }
  
  // If restart endpoint doesn't exist, return gracefully
  if (res.status === 404) {
    return { 
      success: false, 
      message: 'Endpoint de restart não disponível nesta versão da Evolution API' 
    };
  }
  
  if (!res.ok) {
    const body = await res.text();
    return { success: false, message: `Erro ${res.status}: ${body}` };
  }
  
  return { success: true, message: 'Instância reiniciada' };
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
    // Check for specific WhatsApp errors
    if (body.includes('"exists":false')) {
      throw new Error(`Número não possui WhatsApp: ${body}`);
    }
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

// ─── Profile Management ───────────────────────────────────────────────────────

/**
 * Get current profile picture URL for an instance (self profile).
 * Evolution API v2: POST /chat/fetchProfilePictureUrl/{instanceName}
 * Body: { number: "" } — empty string = fetch own profile picture
 */
export async function getProfilePicture(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `${baseUrl(apiUrl)}/chat/fetchProfilePictureUrl/${encodeURIComponent(instanceName)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify({ number: '' }),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.profilePictureUrl as string) ?? (data?.picUrl as string) ?? null;
  } catch {
    return null;
  }
}

/**
 * Set the WhatsApp display name for an instance.
 * Evolution API v2: POST /chat/updateProfileName/{instanceName}
 * Body: { name: string }
 */
export async function setProfileName(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
  name: string,
): Promise<void> {
  const res = await fetch(
    `${baseUrl(apiUrl)}/chat/updateProfileName/${encodeURIComponent(instanceName)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: apiKey },
      body: JSON.stringify({ name }),
    },
  );
  await throwIfNotOk(res, 'setProfileName');
}

/**
 * Set the profile picture for an instance (from URL or base64).
 * Evolution API v2: POST /chat/updateProfilePicture/{instanceName}
 * Body: { picture: string } — URL or base64-encoded image
 */
export async function setProfilePicture(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
  pictureUrl: string,
): Promise<void> {
  const res = await fetch(
    `${baseUrl(apiUrl)}/chat/updateProfilePicture/${encodeURIComponent(instanceName)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: apiKey },
      body: JSON.stringify({ picture: pictureUrl }),
    },
  );
  await throwIfNotOk(res, 'setProfilePicture');
}

/**
 * Get profile status text (WhatsApp "about" / bio) for an instance.
 * Evolution API v2: GET /chat/fetchProfile/{instanceName}
 */
export async function getProfileStatus(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `${baseUrl(apiUrl)}/chat/fetchProfile/${encodeURIComponent(instanceName)}`,
      { headers: { apikey: apiKey } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.status as string) ?? (data?.isBusiness as boolean ? data?.description as string : null) ?? null;
  } catch {
    return null;
  }
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
