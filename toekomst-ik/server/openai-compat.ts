/**
 * Second LLM provider: any OpenAI-compatible chat-completions server (used for the vLLM instance on "kenny"
 * that serves qwen3.8-27b). Same principle as the Claude path: the model only talks, every number comes
 * from a tool call into the shared engine. Plain fetch, no extra dependency.
 */
import { runTool, TOOL_DEFINITIONS, type ChatReply, type ScenarioCard, type Snapshot } from '../engine';
import { systemPrompt } from './prompt';
import type { ValidatedChatRequest } from './schema';

export interface OpenAICompatConfig {
  baseUrl: string;
  model: string;
  apiKey?: string;
}

type Msg =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

interface Completion {
  choices?: { message?: { content?: string | null; tool_calls?: ToolCall[] }; finish_reason?: string }[];
  error?: { message?: string };
}

const MAX_ITERATIONS = 6;

function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

export async function chatWithOpenAICompat(cfg: OpenAICompatConfig, req: ValidatedChatRequest): Promise<ChatReply> {
  const snapshot = req.snapshot as unknown as Snapshot;
  let scenario: ScenarioCard | undefined;
  const toolsUsed: string[] = [];

  const messages: Msg[] = [
    { role: 'system', content: systemPrompt(snapshot, req.alertContext) },
    ...req.messages.map((m): Msg => ({ role: m.role, content: m.content })),
  ];
  if (req.alertContext) {
    const last = messages[messages.length - 1];
    if (last.role === 'user') last.content = `${last.content}\n\n[Waakhond-melding waarover ik het heb]\n${req.alertContext}`;
  }

  const tools = TOOL_DEFINITIONS.map((t) => ({
    type: 'function' as const,
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }));

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}) },
      body: JSON.stringify({ model: cfg.model, messages, tools, tool_choice: 'auto', max_tokens: 1200, temperature: 0.4 }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) throw new Error(`upstream ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as Completion;
    const msg = data.choices?.[0]?.message;
    if (!msg) throw new Error('upstream returned no choices');
    const calls = msg.tool_calls ?? [];
    if (calls.length === 0) {
      const text = stripThinking(msg.content ?? '');
      return {
        reply: text || 'Ik heb even geen woorden, maar de cijfers staan in de app. Stel je vraag nog eens iets anders?',
        mode: 'claude',
        scenario,
        toolsUsed: [...new Set(toolsUsed)],
      };
    }
    messages.push({ role: 'assistant', content: msg.content ?? null, tool_calls: calls });
    for (const call of calls) {
      let args: unknown = {};
      try {
        args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
      } catch {
        args = {};
      }
      toolsUsed.push(call.function.name);
      const out = runTool(call.function.name, args, snapshot);
      if (out.scenarioCard) scenario = out.scenarioCard;
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(out.result) });
    }
  }
  return {
    reply: 'Ik ben blijven rekenen zonder tot een antwoord te komen. Stel je vraag gerust iets concreter.',
    mode: 'claude',
    scenario,
    toolsUsed: [...new Set(toolsUsed)],
  };
}
