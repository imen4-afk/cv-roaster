import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { askGeminiJSON, chatGemini, friendlyError } from '../lib/gemini'
import { COACH_GREETING, COACH_SYSTEM_PROMPT, READY_TOKEN, generateCvPrompt, validateCv } from '../lib/prompts'
import { TOPICS, coveredTopics } from '../lib/topics'
import { supabase } from '../lib/supabase'
import CvTemplate from '../components/CvTemplate'
import CvActions from '../components/CvActions'
import ErrorBox from '../components/ErrorBox'
import { LoadingPanel } from '../components/Spinner'

const stripToken = (t) => t.replaceAll(READY_TOKEN, '').replace(/\n{3,}/g, '\n\n').trim()

function Bubble({ role, children }) {
  const mine = role === 'user'
  return (
    <div className={`fade-up flex ${mine ? 'justify-end' : 'justify-start'}`}>
      {!mine && <span className="me-2 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fire-500/15">🔥</span>}
      <div
        dir="auto"
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed sm:max-w-[75%] ${
          mine ? 'rounded-br-md bg-gradient-to-br from-fire-500 to-ember-600 text-white' : 'rounded-bl-md border border-white/10 bg-neutral-800/80 text-neutral-100'
        }`}
      >
        {children}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <span className="me-2 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fire-500/15">🔥</span>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-white/10 bg-neutral-800/80 px-4 py-3.5" aria-label="Coach is typing">
        {[0, 1, 2].map((i) => (
          <span key={i} className="typing-dot h-2 w-2 rounded-full bg-neutral-400" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )
}

export default function Generate() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([{ role: 'assistant', content: COACH_GREETING }])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [ready, setReady] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [lastFailed, setLastFailed] = useState(null) // 'chat' | 'generate'
  const [cv, setCv] = useState(null)
  const [saveError, setSaveError] = useState('')
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  const covered = useMemo(() => coveredTopics(messages), [messages])
  const progress = ready ? 100 : Math.round((covered.size / TOPICS.length) * 100)
  const userAnswers = messages.filter((m) => m.role === 'user').length

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  async function sendChat(history) {
    setTyping(true)
    setError('')
    try {
      const reply = await chatGemini(history, COACH_SYSTEM_PROMPT)
      const isReady = reply.includes(READY_TOKEN)
      const shown = stripToken(reply) || "Great, I have everything I need! Let's generate your CV. ✨"
      const next = [...history, { role: 'assistant', content: shown }]
      setMessages(next)
      if (isReady) {
        setReady(true)
        generate(next)
      }
    } catch (err) {
      setError(friendlyError(err))
      setLastFailed('chat')
    } finally {
      setTyping(false)
      inputRef.current?.focus()
    }
  }

  function onSubmit(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || typing || generating) return
    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    sendChat(next)
  }

  async function generate(conversation = messages) {
    setGenerating(true)
    setError('')
    setSaveError('')
    try {
      const result = await askGeminiJSON(generateCvPrompt(conversation), validateCv)
      setCv(result)
      const { error: dbError } = await supabase.from('generated_cvs').insert({
        user_id: user.id,
        full_name: result.full_name,
        title: result.title,
        cv: result,
        conversation,
      })
      if (dbError) setSaveError(`CV generated but not saved to your history: ${dbError.message}`)
    } catch (err) {
      setError(friendlyError(err))
      setLastFailed('generate')
    } finally {
      setGenerating(false)
    }
  }

  function retry() {
    if (lastFailed === 'generate') generate()
    else sendChat(messages)
  }

  if (generating) {
    return <LoadingPanel title="Writing your CV…" subtitle="Turning your answers into strong, active bullet points." />
  }

  if (cv) {
    return (
      <div className="flex flex-col gap-6">
        <div className="no-print fade-up flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">Your CV is ready ✨</h1>
            <p className="text-sm text-neutral-400">Download it as PDF, or roast it to make it even better.</p>
            {saveError && <p className="mt-1 text-sm text-amber-400">{saveError}</p>}
          </div>
          <CvActions cv={cv}>
            <button onClick={() => setCv(null)} className="btn-ghost">💬 Back to chat</button>
          </CvActions>
        </div>
        <CvTemplate cv={cv} />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100dvh-7rem)] min-h-[480px] flex-col gap-3">
      <div className="fade-up flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Build my CV 💬</h1>
          <p className="text-sm text-neutral-400">Answer a few questions. English, French or Arabic.</p>
        </div>
        <button onClick={() => generate()} disabled={userAnswers < 2 || typing} className="btn-fire !py-2.5 text-sm" title={userAnswers < 2 ? 'Answer a couple of questions first' : ''}>
          ✨ Generate my CV now
        </button>
      </div>

      <div className="card px-4 py-3">
        <div className="mb-1.5 flex justify-between text-xs text-neutral-400">
          <span>Profile completeness</span>
          <span className="font-semibold text-fire-400">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-gradient-to-r from-fire-500 to-ember-600 transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-2 hidden flex-wrap gap-1.5 sm:flex">
          {TOPICS.map((t) => (
            <span
              key={t.key}
              className={`rounded-full px-2 py-0.5 text-[11px] transition ${covered.has(t.key) ? 'bg-fire-500/20 text-fire-400' : 'bg-white/5 text-neutral-500'}`}
            >
              {covered.has(t.key) ? '✓ ' : ''}
              {t.label}
            </span>
          ))}
        </div>
      </div>

      <div ref={scrollRef} className="card flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role}>{m.content}</Bubble>
        ))}
        {typing && <TypingIndicator />}
        {error && <ErrorBox message={error} onRetry={retry} onDismiss={() => setError('')} />}
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          dir="auto"
          autoFocus
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={typing ? 'Coach is typing…' : 'Type your answer…'}
          disabled={typing}
        />
        <button type="submit" className="btn-fire shrink-0 !px-4" disabled={!input.trim() || typing} aria-label="Send">
          ➤
        </button>
      </form>
    </div>
  )
}
