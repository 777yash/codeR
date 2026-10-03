import 'server-only'
import { z } from 'zod'
import { readLimitedJson } from '@/lib/limited-json'

export const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
export const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b'
export const groqModelSchema = z.enum([
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
])

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const completionSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullable().optional(),
          refusal: z.string().nullable().optional(),
        }),
        finish_reason: z.string().nullable().optional(),
      })
    )
    .min(1),
})

export class GroqHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly retryAfter = 60
  ) {
    // Do not retain upstream response bodies: they can include submitted code.
    super(`Groq returned HTTP ${status}`)
  }
}

export async function callGroqModel(
  apiKey: string,
  model: z.infer<typeof groqModelSchema>,
  messages: GroqMessage[],
  schema: Record<string, unknown>,
  signal: AbortSignal
) {
  signal.throwIfAborted()
  const res = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    signal,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_completion_tokens: 4000,
      reasoning_effort: 'low',
      include_reasoning: false,
      stream: false,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'editor_response', strict: true, schema },
      },
    }),
  })
  if (!res.ok) {
    const header = res.headers?.get('retry-after')
    const seconds = header ? Number(header) : NaN
    const retryAfter =
      Number.isFinite(seconds) && seconds > 0
        ? Math.min(86400, Math.ceil(seconds))
        : 60
    await res.body?.cancel().catch(() => undefined)
    throw new GroqHttpError(res.status, retryAfter)
  }
  // Bound the entire provider envelope, including any hidden reasoning/metadata.
  const parsed = completionSchema.safeParse(
    await readLimitedJson(res, 512 * 1024)
  )
  if (!parsed.success) throw new Error('Groq returned an invalid completion')
  return parsed.data.choices[0]
}
