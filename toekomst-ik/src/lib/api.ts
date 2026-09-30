/**
 * Finds the backend automatically: same host as the Metro dev server, port 3001.
 * Override with EXPO_PUBLIC_API_URL. Any failure -> the caller uses the offline fallback.
 */
import Constants from 'expo-constants';
import type { ChatReply, ChatRequest } from '../../engine';

export const API_PORT = 3001;

export function resolveApiBase(): string {
  const override = process.env.EXPO_PUBLIC_API_URL;
  if (override && override.trim()) return override.trim().replace(/\/$/, '');
  const hostUri = Constants.expoConfig?.hostUri ?? (Constants as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } }).manifest2?.extra?.expoGo?.debuggerHost;
  const host = hostUri ? hostUri.split(':')[0] : 'localhost';
  return `http://${host}:${API_PORT}`;
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export type ServerStatus = 'unknown' | 'online' | 'no_key' | 'offline';

export async function checkHealth(): Promise<ServerStatus> {
  try {
    const res = await fetchWithTimeout(`${resolveApiBase()}/health`, { method: 'GET' }, 2500);
    if (!res.ok) return 'offline';
    const body = (await res.json()) as { ok?: boolean; ai?: string };
    return body.ai && body.ai !== 'none' ? 'online' : 'no_key';
  } catch {
    return 'offline';
  }
}

export class ChatServerError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function sendChat(req: ChatRequest): Promise<ChatReply> {
  const res = await fetchWithTimeout(
    `${resolveApiBase()}/chat`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) },
    75_000,
  );
  const body = (await res.json().catch(() => ({}))) as Partial<ChatReply> & { error?: string; message?: string };
  if (!res.ok) throw new ChatServerError(res.status, body.error ?? 'error', body.message ?? `Server antwoordde ${res.status}`);
  if (typeof body.reply !== 'string') throw new ChatServerError(500, 'bad_reply', 'Onverwacht antwoord van de server');
  return { reply: body.reply, mode: body.mode ?? 'claude', scenario: body.scenario, toolsUsed: body.toolsUsed ?? [] };
}
