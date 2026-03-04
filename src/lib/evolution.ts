/**
 * Evolution API v2 wrapper
 * Docs: https://doc.evolution-api.com
 */

export interface EvolutionInstance {
  name: string;
  connectionStatus: 'open' | 'close' | 'connecting';
  ownerJid?: string;
  number?: string;
  profileName?: string;
  profilePicUrl?: string;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

function mapStatus(evStatus: string): ConnectionStatus {
  if (evStatus === 'open') return 'connected';
  if (evStatus === 'connecting') return 'connecting';
  return 'disconnected';
}

function baseUrl(url: string) {
  return url.replace(/\/$/, '');
}

/** Fetch all instances visible to this API key */
export async function fetchInstances(
  apiUrl: string,
  apiKey: string,
): Promise<EvolutionInstance[]> {
  const res = await fetch(`${baseUrl(apiUrl)}/instance/fetchInstances`, {
    headers: { apikey: apiKey },
  });
  if (!res.ok) throw new Error(`Evolution API error: ${res.status}`);
  return res.json();
}

/** Get connection state for a single instance */
export async function getConnectionState(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
): Promise<ConnectionStatus> {
  const res = await fetch(`${baseUrl(apiUrl)}/instance/connectionState/${encodeURIComponent(instanceName)}`, {
    headers: { apikey: apiKey },
  });
  if (res.status === 404) return 'disconnected';
  if (!res.ok) throw new Error(`Evolution API error: ${res.status}`);
  const data = await res.json();
  // v2 returns { instance: { state: 'open' | 'close' } }
  const state: string = data?.instance?.state ?? data?.state ?? 'close';
  return mapStatus(state);
}

/** Send a text message via a given instance */
export async function sendText(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
  number: string,
  text: string,
): Promise<void> {
  const res = await fetch(`${baseUrl(apiUrl)}/message/sendText/${encodeURIComponent(instanceName)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey,
    },
    body: JSON.stringify({ number, text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`sendText failed (${res.status}): ${body}`);
  }
}

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
