/** Request validation at the server boundary. Everything the app sends is checked here. */
import { z } from 'zod';
import { CATEGORIES, CHAT_LIMITS } from '../engine';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const cents = z.number().finite().min(-1e12).max(1e12);
const short = (max: number) => z.string().max(max);

const goal = z.object({
  id: short(40),
  name: short(80),
  type: z.enum(['huis', 'auto', 'pensioen', 'buffer', 'studie', 'verbouwing', 'ander']),
  targetCents: cents,
  targetDate: isoDate,
  measure: z.enum(['liquid', 'liquid_plus_investments']),
  note: short(200).optional(),
});

const housing = z.discriminatedUnion('type', [
  z.object({ type: z.literal('huur'), rentCents: cents }),
  z.object({
    type: z.literal('hypotheek'),
    principalCents: cents,
    annualRate: z.number().min(0).max(1),
    monthsRemaining: z.number().int().min(0).max(600),
    monthlyPaymentCents: cents,
    homeValueCents: cents,
  }),
]);

const projectionInput = z.object({
  startDate: isoDate,
  birthYear: z.number().int().min(1900).max(2030),
  retirementAge: z.number().int().min(50).max(80),
  netIncomeCents: cents,
  workRegime: z.enum(['voltijds', '4/5', 'halftijds']),
  housing,
  liquidCents: cents,
  investmentsCents: cents,
  fixedMonthlyCents: cents,
  variableMonthlyCents: cents,
  investMonthlyCents: cents,
  goals: z.array(goal).max(10),
  categoryBaselines: z.partialRecord(z.enum(CATEGORIES), cents),
});

const category = z.enum(CATEGORIES);

export const SnapshotSchema = z.object({
  version: short(40),
  personaId: short(40),
  firstName: short(40),
  futureSelfName: short(60),
  age: z.number().int().min(16).max(110),
  city: short(60),
  householdLabel: short(120),
  today: isoDate,
  netIncomeCents: cents,
  workRegime: short(20),
  housing: short(300),
  balances: z.object({ liquidCents: cents, investmentsCents: cents, zichtCents: cents }),
  goals: z
    .array(
      z.object({
        id: short(40),
        name: short(80),
        targetCents: cents,
        targetDate: isoDate,
        currentCents: cents,
        expectedDate: isoDate.nullable(),
        monthsDelta: z.number().nullable(),
      }),
    )
    .max(10),
  categories: z
    .array(
      z.object({
        category,
        baselineCents: cents,
        mtdCents: cents,
        projectedCents: cents,
        months: z.array(z.object({ month: short(7), totalCents: cents })).max(12),
        budgetCents: cents.nullable(),
      }),
    )
    .max(30),
  merchants: z
    .array(z.object({ merchant: short(80), category, thisMonthCents: cents, last3MonthsCents: cents, count3Months: z.number().int() }))
    .max(40),
  subscriptions: z
    .array(z.object({ merchant: short(80), amountCents: cents, kind: short(20), isNew: z.boolean(), previousAmountCents: cents.nullable() }))
    .max(40),
  alerts: z
    .array(
      z.object({
        id: short(120),
        type: short(40),
        severity: z.enum(['info', 'let_op', 'waarschuwing', 'dringend']),
        title: short(120),
        message: short(600),
        why: z.array(short(200)).max(30),
        impact: short(400).nullable(),
        category: category.nullable(),
        merchant: short(80).nullable(),
      }),
    )
    .max(12),
  cashflow: z.object({ minBalanceCents: cents, minDate: isoDate, nextIncomeDate: isoDate.nullable(), nextIncomeCents: cents, bufferCents: cents }),
  projectionInput,
  baseline: z.object({ netWorth2035Cents: cents, liquid2035Cents: cents, netWorthRetirementCents: cents, retirementDate: isoDate, monthlySurplusCents: cents }),
  suggestedQuestions: z.array(short(120)).max(8),
});

export const ChatRequestSchema = z.object({
  snapshot: SnapshotSchema,
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(CHAT_LIMITS.maxMessageChars) }))
    .min(1)
    .max(CHAT_LIMITS.maxMessages),
  alertContext: z.string().max(CHAT_LIMITS.maxAlertContextChars).optional(),
});

export type ValidatedChatRequest = z.infer<typeof ChatRequestSchema>;
