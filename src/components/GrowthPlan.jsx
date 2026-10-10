import { useState } from 'react'
import { resourceLink } from '../lib/resourceLinks'
import { CopyButton } from './Toast'

const SEVERITY = {
  high: { order: 0, label: 'High', cls: 'border-red-500/40 bg-red-500/15 text-red-300' },
  medium: { order: 1, label: 'Medium', cls: 'border-orange-500/40 bg-orange-500/15 text-orange-300' },
  low: { order: 2, label: 'Low', cls: 'border-yellow-500/40 bg-yellow-500/15 text-yellow-200' },
}
const TYPE = {
  learn: { icon: '📘', label: 'Learn' },
  practice: { icon: '🛠️', label: 'Practice' },
  project: { icon: '🚀', label: 'Project' },
  cv_update: { icon: '📝', label: 'CV update' },
}

function Section({ title, icon, children, className = '' }) {
  return (
    <section className={`fade-up avoid-break ${className}`}>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
        <span>{icon}</span> {title}
      </h2>
      {children}
    </section>
  )
}

function Check({ checked, onChange, label }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
      className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded accent-orange-500"
    />
  )
}

function WeekCard({ week, done, onToggle, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const total = week.tasks.length
  const completed = week.tasks.filter((t) => done.has(t.id)).length
  const hours = week.tasks.reduce((s, t) => s + t.hours, 0)

  return (
    <div className="card avoid-break overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 p-4 text-left" aria-expanded={open}>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            completed === total && total ? 'bg-green-500/20 text-green-300' : 'bg-fire-500/15 text-fire-400'
          }`}
        >
          {completed === total && total ? '✓' : `W${week.week}`}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold" dir="auto">Week {week.week}: {week.theme}</p>
          <p className="text-xs text-neutral-500">
            {completed}/{total} tasks · {hours} h
          </p>
        </div>
        <span className={`no-print text-neutral-500 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      <div className={`print-expand grid transition-all duration-300 ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <ul className="divide-y divide-white/5 border-t border-white/5">
            {week.tasks.map((t) => {
              const checked = done.has(t.id)
              const r = t.resource
              return (
                <li key={t.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <label className="flex flex-1 cursor-pointer items-start gap-3">
                    <Check checked={checked} onChange={() => onToggle(t.id, t)} label={t.title} />
                    <span className="min-w-0">
                      <span className={`block text-sm ${checked ? 'text-neutral-500 line-through' : 'text-neutral-100'}`} dir="auto">
                        {TYPE[t.type].icon} {t.title}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {TYPE[t.type].label} · {t.hours} h
                      </span>
                    </span>
                  </label>
                  {r && (
                    <a
                      href={resourceLink(r)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost shrink-0 justify-between !py-1.5 text-xs sm:max-w-64"
                      title={`${r.name} · search: ${r.search_query}`}
                    >
                      <span className="truncate" dir="auto">
                        {r.platform || 'Search'} · {r.name}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.free ? 'bg-green-500/15 text-green-300' : 'bg-amber-500/15 text-amber-300'}`}>
                        {r.free ? 'Free' : 'Paid'}
                      </span>
                      <span aria-hidden>↗</span>
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function GrowthPlan({ plan, completed, onToggle }) {
  const done = new Set(completed)
  const weakPoints = [...plan.weak_points].sort((a, b) => SEVERITY[a.severity].order - SEVERITY[b.severity].order)
  const firstOpenWeek = plan.schedule.find((w) => w.tasks.some((t) => !done.has(t.id)))?.week ?? 1

  return (
    <div className="flex flex-col gap-8">
      {plan.quick_wins.length > 0 && (
        <Section title="Quick wins: do these today" icon="⚡">
          <ul className="card divide-y divide-white/5">
            {plan.quick_wins.map((q, i) => {
              const id = `qw${i}`
              return (
                <li key={id}>
                  <label className="flex cursor-pointer items-start gap-3 p-4">
                    <Check checked={done.has(id)} onChange={() => onToggle(id)} label={q} />
                    <span className={`text-sm ${done.has(id) ? 'text-neutral-500 line-through' : 'text-neutral-200'}`} dir="auto">{q}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </Section>
      )}

      {plan.summary && (
        <Section title="Where you stand" icon="📍">
          <p className="card p-5 leading-relaxed text-neutral-200" dir="auto">{plan.summary}</p>
        </Section>
      )}

      {weakPoints.length > 0 && (
        <Section title="Weak points" icon="🩹">
          <div className="grid gap-3 md:grid-cols-2">
            {weakPoints.map((w, i) => (
              <div key={i} className="card avoid-break flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold" dir="auto">{w.area}</p>
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold ${SEVERITY[w.severity].cls}`}>
                    {SEVERITY[w.severity].label}
                  </span>
                </div>
                {w.evidence_from_cv && (
                  <blockquote className="border-s-2 border-fire-500/60 ps-3 text-sm italic text-neutral-400" dir="auto">
                    “{w.evidence_from_cv}”
                  </blockquote>
                )}
                <p className="text-sm text-neutral-300" dir="auto">
                  <span className="font-semibold text-neutral-100">Why it matters: </span>
                  {w.why_it_matters}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Your pathway" icon="🧭">
        <ol className="relative ms-5 border-s-2 border-fire-500/30">
          {plan.pathway.map((p) => (
            <li key={p.step} className="avoid-break relative mb-6 ps-8 last:mb-0">
              <span className="absolute -start-[17px] top-0 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-fire-500 to-ember-600 text-sm font-bold text-white shadow-lg shadow-fire-600/30">
                {p.step}
              </span>
              <h3 className="pt-1 font-bold" dir="auto">{p.title}</h3>
              {p.goal && <p className="mt-1 text-sm text-neutral-400" dir="auto">{p.goal}</p>}
              {p.skills.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.skills.map((s, i) => (
                    <span key={i} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-neutral-300">{s}</span>
                  ))}
                </div>
              )}
              {p.outcome_for_cv && (
                <div className="mt-3 rounded-xl border border-green-500/30 bg-green-500/10 p-3">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-green-400">Future CV line</p>
                  <p className="text-sm text-green-50" dir="auto">{p.outcome_for_cv}</p>
                </div>
              )}
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Learning schedule" icon="🗓️">
        <div className="flex flex-col gap-3">
          {plan.schedule.map((w) => (
            <WeekCard key={w.week} week={w} done={done} onToggle={onToggle} defaultOpen={w.week === firstOpenWeek} />
          ))}
        </div>
      </Section>

      {plan.milestone_projects.length > 0 && (
        <Section title="Milestone projects" icon="🏆">
          <div className="grid gap-3 md:grid-cols-2">
            {plan.milestone_projects.map((m, i) => {
              const id = `mp${i}`
              return (
                <div key={id} className={`card avoid-break flex flex-col gap-3 p-5 ${done.has(id) ? 'border-green-500/40' : ''}`}>
                  <h3 className="font-bold" dir="auto">{m.title}</h3>
                  <p className="text-sm text-neutral-300" dir="auto">{m.description}</p>
                  {m.skills_proven.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.skills_proven.map((s, j) => (
                        <span key={j} className="rounded-full border border-fire-500/30 bg-fire-500/10 px-2.5 py-0.5 text-xs text-fire-400">{s}</span>
                      ))}
                    </div>
                  )}
                  {m.cv_bullet_template && (
                    <div className="rounded-xl border border-white/10 bg-neutral-950 p-3">
                      <p className="text-sm text-neutral-100" dir="auto">{m.cv_bullet_template}</p>
                      <CopyButton text={m.cv_bullet_template} className="mt-2" />
                    </div>
                  )}
                  <label className="no-print mt-auto flex cursor-pointer items-center gap-2 text-sm text-neutral-300">
                    <Check checked={done.has(id)} onChange={() => onToggle(id, null, m)} label={`Mark ${m.title} as done`} />
                    Project done
                  </label>
                </div>
              )
            })}
          </div>
        </Section>
      )}
    </div>
  )
}
