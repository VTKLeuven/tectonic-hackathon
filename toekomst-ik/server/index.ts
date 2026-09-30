/**
 * Toekomst-ik backend: a tiny stateless HTTP server with one job, POST /chat.
 * The API key lives only here (server/.env). The app never sees it.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { ChatRequestSchema } from './schema';
import { chatWithClaude, MODEL } from './chat';
import { chatWithOpenAICompat } from './openai-compat';

// --- .env (no dependency needed) ---------------------------------------------------------------
const here = path.dirname(fileURLToPath(import.meta.url));
for (const file of [path.join(here, '.env'), path.join(here, '..', '.env')]) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const PORT = Number(process.env.PORT ?? 3001);
const HOST = '0.0.0.0';
const MAX_BODY_BYTES = 256 * 1024;
const RATE_LIMIT = { windowMs: 60_000, max: 30 };

const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
const client = apiKey ? new Anthropic({ apiKey, timeout: 90_000, maxRetries: 1 }) : null;
// Fallback provider: an OpenAI-compatible server (vLLM on "kenny", reached through an SSH tunnel).
const local = process.env.LLM_BASE_URL?.trim()
  ? { baseUrl: process.env.LLM_BASE_URL.trim(), model: process.env.LLM_MODEL?.trim() || 'qwen3.8-27b', apiKey: process.env.LLM_API_KEY?.trim() || undefined }
  : null;
const aiMode: 'claude' | 'local' | 'none' = client ? 'claude' : local ? 'local' : 'none';

// --- helpers -----------------------------------------------------------------------------------
function json(res: http.ServerResponse, status: number, body: unknown): void {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(data);
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('body_too_large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > RATE_LIMIT.max;
}

// --- server ------------------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const ip = req.socket.remoteAddress ?? 'unknown';
  const url = req.url ?? '/';
  try {
    if (req.method === 'OPTIONS') return json(res, 204, {});
    if (req.method === 'GET' && url === '/health') {
      return json(res, 200, { ok: true, ai: aiMode });
    }
    if (req.method !== 'POST' || url !== '/chat') return json(res, 404, { error: 'not_found' });
    if (rateLimited(ip)) return json(res, 429, { error: 'rate_limited', message: 'Even rustig aan: maximaal 30 vragen per minuut.' });

    let body: unknown;
    try {
      body = JSON.parse(await readBody(req));
    } catch (e) {
      const tooLarge = e instanceof Error && e.message === 'body_too_large';
      return json(res, tooLarge ? 413 : 400, { error: tooLarge ? 'body_too_large' : 'invalid_json' });
    }
    const parsed = ChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return json(res, 400, { error: 'invalid_request', issues: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`) });
    }
    if (!client && !local) {
      return json(res, 503, { error: 'no_api_key', message: 'De server heeft geen ANTHROPIC_API_KEY of LLM_BASE_URL (zet die in server/.env). De app gebruikt de offline modus.' });
    }
    const t0 = Date.now();
    const reply = client ? await chatWithClaude(client, parsed.data) : await chatWithOpenAICompat(local!, parsed.data);
    console.log(`[chat] ${parsed.data.snapshot.personaId} ${Date.now() - t0} ms tools=${reply.toolsUsed.join(',') || '-'}`);
    return json(res, 200, reply);
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return json(res, 502, { error: 'auth', message: 'De API-sleutel werd geweigerd. Controleer server/.env.' });
    if (err instanceof Anthropic.RateLimitError) return json(res, 429, { error: 'upstream_rate_limited', message: 'Even te druk bij de AI. Probeer zo opnieuw.' });
    if (err instanceof Anthropic.APIConnectionError) return json(res, 502, { error: 'upstream_unreachable', message: 'De AI is niet bereikbaar.' });
    if (err instanceof Anthropic.APIError) return json(res, 502, { error: 'upstream_error', message: `AI-fout (${err.status ?? '?'}).` });
    console.error('[chat] unexpected', err);
    return json(res, 500, { error: 'internal', message: 'Er ging iets mis op de server.' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Toekomst-ik backend luistert op http://${HOST}:${PORT}`);
  if (client) console.log(`AI: ${MODEL} (effort low, server-side fallbacks aan)`);
  else if (local) console.log(`AI: ${local.model} via ${local.baseUrl} (OpenAI-compatibel; start de tunnel met npm run tunnel)`);
  else console.log('AI: geen ANTHROPIC_API_KEY of LLM_BASE_URL gevonden, /chat antwoordt 503 en de app gebruikt de offline modus');
});
