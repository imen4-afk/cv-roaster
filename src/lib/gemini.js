// Thin wrapper around the Gemini REST API.
// Flash-Lite is the fastest Gemini tier (~3 s for a roast vs. minutes for Flash under load).
// Pinned rather than the `gemini-flash-lite-latest` alias so behavior doesn't change silently.
export const MODEL = 'gemini-3.5-flash-lite'
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}`

export const CHAT_MAX_TOKENS = 1024
export const JSON_MAX_TOKENS = 4096
// Only the most recent messages are sent with each chat turn, to keep requests small.
const MAX_CHAT_MESSAGES = 20

// Thinking slows answers down a lot and isn't needed here. Gemini 3 models take
// `thinkingLevel`, 2.5 models take `thinkingBudget`; if the API rejects one, try the next.
const THINKING_OPTIONS = [{ thinkingLevel: 'minimal' }, { thinkingBudget: 0 }, null]
let thinkingIdx = 0

export class GeminiError extends Error {
  constructor(message, { retryable = true, kind = 'api' } = {}) {
    super(message)
    this.name = 'GeminiError'
    this.retryable = retryable
    this.kind = kind
  }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

let callSeq = 0
async function timed(label, fn) {
  const id = `⏱ gemini ${label} #${++callSeq} (${MODEL})`
  console.time(id)
  try {
    return await fn()
  } finally {
    console.timeEnd(id)
  }
}

async function errorFrom(res) {
  let detail = ''
  try {
    detail = (await res.json())?.error?.message || ''
  } catch {
    /* ignore */
  }
  // Bad request / bad key won't fix themselves on retry; rate limits and 5xx might.
  return new GeminiError(`Gemini error ${res.status}${detail ? `: ${detail}` : ''}`, {
    retryable: res.status === 429 || res.status >= 500,
    kind: res.status === 429 ? 'rate' : res.status >= 500 ? 'server' : 'api',
  })
}

// POST to the model, adding the thinking config. On a 400 caused by that config,
// fall back to the next option and resend (this doesn't count as the retry).
async function post(method, body) {
  if (!API_KEY) {
    throw new GeminiError('Missing environment variables. Add them in Vercel Project Settings and redeploy. (VITE_GEMINI_API_KEY)', {
      retryable: false,
      kind: 'config',
    })
  }

  for (;;) {
    const thinking = THINKING_OPTIONS[thinkingIdx]
    const payload = { ...body, generationConfig: { ...body.generationConfig, ...(thinking && { thinkingConfig: thinking }) } }
    let res
    try {
      res = await fetch(`${BASE_URL}:${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
        body: JSON.stringify(payload),
      })
    } catch {
      throw new GeminiError('Could not reach Gemini. Check your internet connection.', { kind: 'network' })
    }

    if (res.status === 400 && thinking && thinkingIdx < THINKING_OPTIONS.length - 1) {
      const msg = (await res.clone().json().catch(() => ({})))?.error?.message || ''
      if (/thinking|invalid argument/i.test(msg)) {
        console.warn(`Gemini rejected thinkingConfig ${JSON.stringify(thinking)}, trying the next option.`)
        thinkingIdx++
        continue
      }
    }
    if (!res.ok) throw await errorFrom(res)
    return res
  }
}

const textOf = (data) => data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') ?? ''

async function callGemini(body) {
  const data = await (await post('generateContent', body)).json()
  const candidate = data.candidates?.[0]
  const text = textOf(data)
  if (candidate?.finishReason === 'MAX_TOKENS') {
    // A cut-off JSON answer can't be parsed; treat it like invalid JSON so it's retried once.
    throw new GeminiError('Gemini hit the output token limit.', { kind: 'json' })
  }
  if (!text.trim()) {
    const reason = data.promptFeedback?.blockReason || candidate?.finishReason || 'empty response'
    throw new GeminiError(`Gemini returned no text (${reason}).`, { kind: 'empty' })
  }
  return text
}

// Server-sent events: calls onText(fullTextSoFar) as chunks arrive and returns the full text.
async function streamGemini(body, onText) {
  const res = await post('streamGenerateContent?alt=sse', body)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''
  let blockReason = ''

  const handleEvent = (event) => {
    const data = event
      .split(/\r?\n/)
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).trim())
      .join('')
    if (!data) return
    const json = JSON.parse(data)
    blockReason ||= json.promptFeedback?.blockReason || ''
    const chunk = textOf(json)
    if (chunk) {
      full += chunk
      onText(full)
    }
  }

  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split(/\r?\n\r?\n/)
      buffer = events.pop()
      events.forEach(handleEvent)
    }
    buffer += decoder.decode()
    if (buffer.trim()) handleEvent(buffer)
  } catch (e) {
    if (e instanceof SyntaxError) throw new GeminiError('Gemini sent a malformed stream.', { kind: 'api' })
    throw new GeminiError('The connection to Gemini dropped mid-answer.', { kind: 'network' })
  }

  if (!full.trim()) throw new GeminiError(`Gemini returned no text (${blockReason || 'empty response'}).`, { kind: 'empty' })
  return full
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
export async function askGeminiJSON(prompt, validate, { maxOutputTokens = JSON_MAX_TOKENS, label = 'json' } = {}) {
  return timed(label, () =>
    withRetry(async () => {
      const text = await callGemini({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.6, maxOutputTokens },
      })
      const json = parseJSON(text)
      if (!validate) return json
      try {
        return validate(json)
      } catch (e) {
        throw new GeminiError(`Gemini returned JSON in an unexpected shape (${e.message}).`, { kind: 'json' })
      }
    }),
  )
}

/**
 * Multi-turn chat. `history` is [{ role: 'user' | 'assistant', content: string }].
 * With `onText`, the reply is streamed and onText(textSoFar) is called as it grows
 * (with '' when a retry restarts it). Returns the full reply text.
 */
export async function chatGemini(history, systemPrompt, onText) {
  const recent = history.slice(-MAX_CHAT_MESSAGES)
  // Gemini requires the conversation to start with a user turn.
  const turns = recent[0]?.role === 'assistant' ? [{ role: 'user', content: 'Hi!' }, ...recent] : recent
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: turns.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    generationConfig: { temperature: 0.7, maxOutputTokens: CHAT_MAX_TOKENS },
  }
  return timed('chat', () =>
    withRetry(() => {
      if (!onText) return callGemini(body)
      onText('')
      return streamGemini(body, onText)
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
