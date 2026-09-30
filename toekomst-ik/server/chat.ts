/**
 * The future self, powered by Claude. The engine calculates, the AI talks:
 * every number comes from a tool call into the shared engine.
 */
import Anthropic from '@anthropic-ai/sdk';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { CATEGORIES, runTool, TOOL_DEFINITIONS, type ChatReply, type ScenarioCard, type Snapshot } from '../engine';
import { systemPrompt } from './prompt';
import type { ValidatedChatRequest } from './schema';

export const MODEL = 'claude-opus-5-5';

const def = (name: string) => {
  const d = TOOL_DEFINITIONS.find((t) => t.name === name);
  if (!d) throw new Error(`tool ${name} missing`);
  return d.description;
};

export async function chatWithClaude(client: Anthropic, req: ValidatedChatRequest): Promise<ChatReply> {
  const snapshot = req.snapshot as unknown as Snapshot;
  let scenario: ScenarioCard | undefined;
  const toolsUsed: string[] = [];

  const run = (name: string) => (args: unknown) => {
    toolsUsed.push(name);
    const out = runTool(name, args, snapshot);
    if (out.scenarioCard) scenario = out.scenarioCard;
    return JSON.stringify(out.result);
  };

  const tools = [
    betaZodTool({ name: 'get_financial_snapshot', description: def('get_financial_snapshot'), inputSchema: z.object({}), run: run('get_financial_snapshot') }),
    betaZodTool({
      name: 'simulate_scenario',
      description: def('simulate_scenario'),
      inputSchema: z.object({
        workRegime: z.enum(['voltijds', '4/5', 'halftijds']).optional().describe('Nieuw werkregime'),
        homePurchase: z
          .object({
            priceEuros: z.number().describe('Aankoopprijs in euro'),
            year: z.number().int().describe('Jaar van aankoop'),
            ownContributionEuros: z.number().optional().describe('Eigen inbreng in euro'),
          })
          .optional(),
        extraMonthlySavingEuros: z.number().optional().describe('Elke maand extra opzij (positief) of minder (negatief), in euro'),
        categoryChange: z
          .object({
            category: z.enum(CATEGORIES),
            deltaMonthlyEuros: z.number().describe('Verandering per maand in euro; negatief = minder uitgeven'),
          })
          .optional(),
        child: z.object({ year: z.number().int() }).optional(),
        car: z.object({ priceEuros: z.number(), year: z.number().int() }).optional(),
      }),
      run: run('simulate_scenario'),
    }),
    betaZodTool({
      name: 'get_spending_details',
      description: def('get_spending_details'),
      inputSchema: z.object({
        category: z.enum(CATEGORIES).optional(),
        merchant: z.string().max(80).optional().describe('Naam van de handelaar, bv. "Deliveroo"'),
      }),
      run: run('get_spending_details'),
    }),
    betaZodTool({ name: 'get_alerts', description: def('get_alerts'), inputSchema: z.object({}), run: run('get_alerts') }),
  ];

  const messages: Anthropic.Beta.BetaMessageParam[] = req.messages.map((m) => ({ role: m.role, content: m.content }));
  if (req.alertContext && messages.length) {
    const last = messages[messages.length - 1];
    if (last.role === 'user' && typeof last.content === 'string') {
      last.content = `${last.content}\n\n[Waakhond-melding waarover ik het heb]\n${req.alertContext}`;
    }
  }

  const final = await client.beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 8000,
    system: systemPrompt(snapshot, req.alertContext),
    messages,
    tools,
    tool_choice: { type: 'auto' },
    output_config: { effort: 'low' },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    max_iterations: 8,
  });

  if (final.stop_reason === 'refusal') {
    return {
      reply: 'Daar kan ik je helaas niet mee helpen. Vraag me gerust iets over je uitgaven, je doelen of een wat-als-scenario.',
      mode: 'claude',
      toolsUsed,
    };
  }

  const text = final.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  return {
    reply: text || 'Ik heb even geen woorden, maar de cijfers staan in de app. Stel je vraag nog eens iets anders?',
    mode: 'claude',
    scenario,
    toolsUsed: [...new Set(toolsUsed)],
  };
}
