// Thin wrapper around the Gemini REST API.
// `gemini-flash-latest` is Google's alias that always points to the newest Flash model.
const MODEL = 'gemini-flash-latest'
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

export class GeminiError extends Error {
  constructor(message, { retryable = true, kind = 'api' } = {}) {
    super(message)
    this.name = 'GeminiError'
    this.retryable = retryable
    this.kind = kind
  }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function callGemini(body) {
  if (!API_KEY) {
    throw new GeminiError('Missing environment variables. Add them in Vercel Project Settings and redeploy. (VITE_GEMINI_API_KEY)', {
      retryable: false,
      kind: 'config',
    })
  }

  let res
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
      body: JSON.stringify(body),
    })
  } catch {
    throw new GeminiError('Could not reach Gemini. Check your internet connection.', { kind: 'network' })
  }

  if (!res.ok) {
    let detail = ''
    try {
      detail = (await res.json())?.error?.message || ''
    } catch {
      /* ignore */
    }
    // Bad request / bad key won't fix themselves on retry; rate limits and 5xx might.
    const retryable = res.status === 429 || res.status >= 500
    throw new GeminiError(`Gemini error ${res.status}${detail ? `: ${detail}` : ''}`, {
      retryable,
      kind: res.status === 429 ? 'rate' : res.status >= 500 ? 'server' : 'api',
    })
  }

  const data = await res.json()
  const candidate = data.candidates?.[0]
  const text = candidate?.content?.parts?.map((p) => p.text || '').join('') ?? ''
  if (!text.trim()) {
    const reason = data.promptFeedback?.blockReason || candidate?.finishReason || 'empty response'
    throw new GeminiError(`Gemini returned no text (${reason}).`, { kind: 'empty' })
  }
  return text
}

// Run once, and retry exactly one more time on a retryable failure.
async function withRetry(fn) {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof GeminiError && !err.retryable) throw err
    // Overload/rate-limit spikes need a bit longer to clear than a malformed answer.
    await wait(err.kind === 'rate' || err.kind === 'server' ? 2500 : 800)
    return fn()
  }
}

function parseJSON(text) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  try {
    return JSON.parse(cleaned)
  } catch {
    throw new GeminiError('Gemini returned invalid JSON.', { kind: 'json' })
  }
}

/**
 * Ask Gemini for a JSON answer. `validate` (optional) may throw or return a
 * normalized object; a failure there counts as invalid JSON and triggers the retry.
 */
export async function askGeminiJSON(prompt, validate) {
  return withRetry(async () => {
    const text = await callGemini({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.6 },
    })
    const json = parseJSON(text)
    if (!validate) return json
    try {
      return validate(json)
    } catch (e) {
      throw new GeminiError(`Gemini returned JSON in an unexpected shape (${e.message}).`, { kind: 'json' })
    }
  })
}

/**
 * Multi-turn chat. `history` is [{ role: 'user' | 'assistant', content: string }].
 * Returns the assistant's reply text.
 */
export async function chatGemini(history, systemPrompt) {
  // Gemini requires the conversation to start with a user turn.
  const turns = history[0]?.role === 'assistant' ? [{ role: 'user', content: 'Hi!' }, ...history] : history
  return withRetry(() =>
    callGemini({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: turns.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: { temperature: 0.7 },
    }),
  )
}

export function friendlyError(err) {
  if (!(err instanceof GeminiError)) return 'Something went wrong. Please try again.'
  switch (err.kind) {
    case 'config':
      return err.message
    case 'network':
      return "We couldn't reach the AI. Check your connection and try again."
    case 'rate':
      return 'The AI is a bit overwhelmed right now (rate limit). Wait a few seconds and try again.'
    case 'server':
      return 'The AI service is temporarily unavailable. Please try again in a moment.'
    case 'json':
      return 'The AI answered in a format we could not read, even after a retry. Please try again.'
    case 'empty':
      return 'The AI returned an empty answer (it may have been filtered). Try rephrasing.'
    default:
      return `The AI ran into a problem: ${err.message}`
  }
}
