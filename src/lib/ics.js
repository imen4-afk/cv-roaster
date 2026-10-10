import { resourceLink } from './resourceLinks'

const pad = (n) => String(n).padStart(2, '0')
const fmtDate = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
// Floating local time (no Z): the event shows at 18:00 in whatever time zone the calendar uses.
const fmtLocal = (d) => `${fmtDate(d)}T${pad(d.getHours())}${pad(d.getMinutes())}00`
const fmtUtc = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const esc = (s) =>
  String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')

// RFC 5545: lines longer than 75 characters are folded with CRLF + space.
function fold(line) {
  const chars = Array.from(line)
  const out = []
  for (let i = 0; i < chars.length; i += 74) out.push((i ? ' ' : '') + chars.slice(i, i + 74).join(''))
  return out.join('\r\n')
}

const addDays = (d, n) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function nextMonday(from = new Date()) {
  const d = new Date(from)
  d.setHours(0, 0, 0, 0)
  const days = (8 - d.getDay()) % 7 || 7 // always the *next* Monday, never today
  return addDays(d, days)
}

function duration(hours) {
  const mins = Math.max(15, Math.round(Number(hours || 1) * 60))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}`
}

/**
 * One all-day event per week (the week's theme), plus one timed event per task,
 * spread across that week at 18:00 and lasting the task's hours.
 */
export function buildPlanIcs(plan, inputs, start = nextMonday()) {
  const stamp = fmtUtc(new Date())
  const uidBase = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CV Roaster//Growth Plan//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${esc(`Growth Plan · ${inputs?.targetRole || ''}`)}`]

  const event = (uid, props) => {
    lines.push('BEGIN:VEVENT', `UID:${uid}@cv-roaster`, `DTSTAMP:${stamp}`, ...props, 'END:VEVENT')
  }

  plan.schedule.forEach((week, wi) => {
    const monday = addDays(start, wi * 7)
    event(`${uidBase}-w${week.week}`, [
      `DTSTART;VALUE=DATE:${fmtDate(monday)}`,
      `DTEND;VALUE=DATE:${fmtDate(addDays(monday, 7))}`,
      `SUMMARY:${esc(`Week ${week.week}: ${week.theme}`)}`,
      `DESCRIPTION:${esc(week.tasks.map((t) => `• ${t.title} (${t.hours}h)`).join('\n'))}`,
      'TRANSP:TRANSPARENT',
    ])

    const n = week.tasks.length
    week.tasks.forEach((task, ti) => {
      const day = addDays(monday, Math.floor((ti * 7) / Math.max(n, 1)))
      day.setHours(18, 0, 0, 0)
      const r = task.resource
      const desc = [
        `Week ${week.week} · ${week.theme}`,
        r?.name && `Resource: ${r.name}${r.platform ? ` (${r.platform})` : ''}${r.free === false ? ' · paid' : ''}`,
        r && `Find it: ${resourceLink(r)}`,
      ]
        .filter(Boolean)
        .join('\n')
      event(`${uidBase}-${task.id}`, [`DTSTART:${fmtLocal(day)}`, `DURATION:${duration(task.hours)}`, `SUMMARY:${esc(task.title)}`, `DESCRIPTION:${esc(desc)}`])
    })
  })

  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

export function downloadIcs(content, filename = 'growth-plan.ics') {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
