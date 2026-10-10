import { useState } from 'react'
import ScoreGauge from './ScoreGauge'

function Section({ title, icon, children, delay = 0 }) {
  return (
    <section className="fade-up" style={{ animationDelay: `${delay}ms` }}>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
        <span>{icon}</span> {title}
      </h2>
      {children}
    </section>
  )
}

function MismatchCard({ item, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 p-4 text-left" aria-expanded={open}>
        <span className="text-fire-400">⚠️</span>
        <span className="flex-1 font-medium" dir="auto">{item.issue}</span>
        <span className={`text-neutral-500 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      <div className={`grid transition-all duration-300 ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="space-y-3 border-t border-white/5 px-4 pb-4 pt-3 text-sm">
            <p dir="auto">
              <span className="font-semibold text-red-300">Why it won't match: </span>
              <span className="text-neutral-300">{item.why_it_wont_match}</span>
            </p>
            <p dir="auto">
              <span className="font-semibold text-green-300">How to fix: </span>
              <span className="text-neutral-300">{item.how_to_fix}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AnalysisResult({ result }) {
  const { score, verdict, roast, strengths, weakest_bullet: wb, mismatch, missing_keywords } = result

  return (
    <div className="flex flex-col gap-8">
      <div className="card fade-up flex flex-col items-center gap-6 p-6 text-center sm:flex-row sm:p-8 sm:text-left">
        <ScoreGauge score={score} />
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-fire-400">The verdict</p>
          <h2 className="text-2xl font-extrabold leading-tight sm:text-3xl" dir="auto">
            “{verdict}”
          </h2>
        </div>
      </div>

      {roast.length > 0 && (
        <Section title="The roast" icon="🔥" delay={100}>
          <div className="grid gap-3 sm:grid-cols-2">
            {roast.map((r, i) => (
              <div key={i} className="card flex gap-3 border-fire-500/20 p-4 hover:border-fire-500/50">
                <span className="text-xl">🔥</span>
                <p className="text-sm text-neutral-200" dir="auto">{r}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {strengths.length > 0 && (
        <Section title="What's actually good" icon="✅" delay={200}>
          <div className="grid gap-3 sm:grid-cols-2">
            {strengths.map((s, i) => (
              <div key={i} className="flex gap-3 rounded-2xl border border-green-500/25 bg-green-500/10 p-4">
                <span className="text-green-400">✓</span>
                <p className="text-sm text-green-100" dir="auto">{s}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {wb?.original && (
        <Section title="Your weakest bullet, fixed" icon="✍️" delay={300}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-red-400">Before</p>
              <p className="text-neutral-300 line-through decoration-red-500/50" dir="auto">{wb.original}</p>
            </div>
            <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-green-400">After</p>
              <p className="font-medium text-white" dir="auto">{wb.rewritten}</p>
            </div>
          </div>
          {wb.why_better && (
            <p className="mt-3 text-sm text-neutral-400" dir="auto">
              <span className="font-semibold text-neutral-200">Why it's better: </span>
              {wb.why_better}
            </p>
          )}
        </Section>
      )}

      {mismatch.length > 0 && (
        <Section title="Why this won't match" icon="🎯" delay={400}>
          <div className="flex flex-col gap-3">
            {mismatch.map((m, i) => (
              <MismatchCard key={i} item={m} defaultOpen={i === 0} />
            ))}
          </div>
        </Section>
      )}

      {missing_keywords.length > 0 && (
        <Section title="Missing keywords" icon="🔑" delay={500}>
          <div className="flex flex-wrap gap-2">
            {missing_keywords.map((k, i) => (
              <span key={i} className="rounded-full border border-fire-500/40 bg-fire-500/10 px-3 py-1 text-sm text-fire-400" dir="auto">
                {k}
              </span>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
