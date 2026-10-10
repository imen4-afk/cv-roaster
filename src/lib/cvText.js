// Helpers shared by the CV template and the "Roast this CV" plain-text export.

export const asText = (v) => {
  if (v == null) return ''
  if (typeof v === 'string' || typeof v === 'number') return String(v)
  if (typeof v === 'object') {
    const name = v.name || v.language || v.title || v.skill || ''
    const extra = v.level || v.issuer || v.date || ''
    return [name, extra && `(${extra})`].filter(Boolean).join(' ') || Object.values(v).filter(Boolean).join(' - ')
  }
  return String(v)
}

export const contactEntries = (contact = {}) =>
  Object.entries(contact).filter(([, v]) => typeof v === 'string' && v.trim())

export function cvToText(cv) {
  const lines = []
  lines.push(cv.full_name, cv.title)
  const contacts = contactEntries(cv.contact).map(([, v]) => v)
  if (contacts.length) lines.push(contacts.join(' | '))
  if (cv.summary) lines.push('', 'SUMMARY', cv.summary)

  if (cv.experience?.length) {
    lines.push('', 'EXPERIENCE')
    cv.experience.forEach((e) => {
      lines.push([e.role, e.org].filter(Boolean).join(' - ') + (e.dates ? ` (${e.dates})` : ''))
      ;(e.bullets || []).forEach((b) => lines.push(`- ${b}`))
    })
  }
  if (cv.education?.length) {
    lines.push('', 'EDUCATION')
    cv.education.forEach((e) => {
      if (typeof e === 'string') return lines.push(e)
      lines.push([e.degree, e.school].filter(Boolean).join(' - ') + (e.dates ? ` (${e.dates})` : ''))
      if (e.details) lines.push(e.details)
    })
  }
  if (cv.projects?.length) {
    lines.push('', 'PROJECTS')
    cv.projects.forEach((p) => {
      if (typeof p === 'string') return lines.push(`- ${p}`)
      lines.push([p.name, p.description].filter(Boolean).join(': '))
      ;(p.bullets || []).forEach((b) => lines.push(`- ${b}`))
    })
  }
  if (cv.skills?.length) lines.push('', 'SKILLS', cv.skills.map(asText).join(', '))
  if (cv.languages?.length) lines.push('', 'LANGUAGES', cv.languages.map(asText).join(', '))
  if (cv.certifications?.length) lines.push('', 'CERTIFICATIONS', ...cv.certifications.map((c) => `- ${asText(c)}`))

  return lines.filter((l) => l != null).join('\n').trim()
}
