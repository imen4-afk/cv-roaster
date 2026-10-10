export const HOURS_OPTIONS = ['3', '5', '10', '15+']
export const WEEKS_OPTIONS = ['2', '4', '8', '12']
export const STYLE_OPTIONS = ['Videos', 'Reading', 'Hands-on projects', 'Mixed']
export const BUDGET_OPTIONS = ['Free only', 'Free + paid']
export const LANGUAGE_OPTIONS = ['English', 'French', 'Arabic']

// Maximum weekly hours the plan may use. "15+" is capped at 20 to keep plans realistic.
export const hoursCap = (hours) => (hours === '15+' ? 20 : Number(hours) || 5)

export function growthPlanPrompt({ cvText, roast, jobDescription, inputs }) {
  const cap = hoursCap(inputs.hours)
  const weeks = Number(inputs.weeks)
  const freeOnly = inputs.budget === 'Free only'
  const mismatch = (roast.mismatch || []).map((m) => `- ${m.issue}: ${m.why_it_wont_match} (suggested fix: ${m.how_to_fix})`).join('\n')

  return `You are a senior career coach and learning designer. Build a personalised, realistic "Growth Plan" that takes this person from their current CV to the target role.

TARGET ROLE: ${inputs.targetRole}

${jobDescription?.trim() ? `TARGET JOB DESCRIPTION:\n"""\n${jobDescription.trim()}\n"""` : 'No job description was given: use typical expectations for the target role.'}

CV:
"""
${cvText.trim()}
"""

FINDINGS FROM A PREVIOUS REVIEW OF THIS CV:
Weaknesses:
${(roast.roast || []).map((r) => `- ${r}`).join('\n') || '- (none listed)'}
Why it won't match:
${mismatch || '- (none listed)'}
Missing keywords: ${(roast.missing_keywords || []).join(', ') || '(none listed)'}

LEARNER PREFERENCES:
- Hours available per week: ${inputs.hours} (hard cap: ${cap} hours per week)
- Plan length: ${weeks} weeks
- Preferred learning style: ${inputs.style}
- Budget: ${inputs.budget}
- Preferred language for resources: ${inputs.language}

Return ONLY a JSON object with EXACTLY this shape:
{
  "summary": "2-3 sentences on where the user stands today vs the target role",
  "weak_points": [
    { "area": "...", "severity": "high" | "medium" | "low", "evidence_from_cv": "...", "why_it_matters": "..." }
  ],
  "pathway": [
    { "step": 1, "title": "...", "goal": "...", "skills": ["..."], "outcome_for_cv": "the new bullet or project the user will be able to add after this step" }
  ],
  "schedule": [
    {
      "week": 1,
      "theme": "...",
      "tasks": [
        { "id": "w1t1", "title": "...", "type": "learn" | "practice" | "project" | "cv_update", "hours": 2,
          "resource": { "name": "...", "platform": "...", "format": "video" | "course" | "docs" | "article" | "practice", "free": true, "search_query": "..." } }
      ]
    }
  ],
  "milestone_projects": [ { "title": "...", "description": "...", "skills_proven": ["..."], "cv_bullet_template": "..." } ],
  "quick_wins": ["changes the user can make to the CV today without learning anything new"]
}

RULES:
- Base every weak point on evidence from the CV: "evidence_from_cv" must quote the CV (or state precisely what is absent from it). Never invent experience, employers, numbers or skills the CV does not show.
- "schedule" must contain exactly ${weeks} weeks, numbered 1 to ${weeks}, with 2-5 tasks each.
- The total "hours" of the tasks in any week must NOT exceed ${cap}. Use realistic hours (0.5 to ${Math.min(cap, 8)} per task).
- Include a "cv_update" task at least every 2-3 weeks, so the user turns what they learned into CV content. The last week must include one.
- Only recommend well-known, reputable platforms: freeCodeCamp, MDN, Coursera, edX, Google Skills, Microsoft Learn, Kaggle Learn, The Odin Project, roadmap.sh, official documentation, YouTube, TryHackMe, Khan Academy, GitHub, or similarly established ones. Put the platform's real name in "platform".
- Do NOT output any URL anywhere. Instead, give a precise "search_query": the exact words to type into that platform's search to find the resource.
- ${freeOnly ? 'Budget is FREE ONLY: every resource must be free ("free": true). Never suggest paid courses or certificates.' : 'Budget allows paid resources, but prefer free ones and set "free" honestly.'}
- Prefer resources in ${inputs.language}; write "search_query" in ${inputs.language} when good resources exist in that language, otherwise use English.
- Match the learning style "${inputs.style}" when choosing resource formats (for "Mixed", vary them).
- Order "pathway" from the highest-impact gap to the lowest, with 3-6 steps. Each "outcome_for_cv" is a concrete CV bullet or project line the user can add after the step, with [placeholders] for numbers they don't have yet.
- Give 2-3 "milestone_projects" that prove the most important skills; "cv_bullet_template" uses a strong action verb and [placeholders] for metrics.
- Give 3-6 "quick_wins" the user can apply to the CV today without learning anything new.
- Write all text except "search_query" in the same language as the CV.`
}

const arr = (v) => (Array.isArray(v) ? v : [])
const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v))
const noUrls = (s) => str(s).replace(/https?:\/\/\S+/gi, '').trim()
const oneOf = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback)

// Throws on unusable shape (triggers askGeminiJSON's retry); otherwise returns a normalized plan.
export function validatePlan(j) {
  if (!j || typeof j !== 'object') throw new Error('not an object')
  const schedule = arr(j.schedule)
  if (!schedule.length) throw new Error('missing schedule')
  if (!arr(j.pathway).length) throw new Error('missing pathway')

  return {
    summary: str(j.summary),
    weak_points: arr(j.weak_points).map((w) => ({
      area: str(w?.area),
      severity: oneOf(str(w?.severity).toLowerCase(), ['high', 'medium', 'low'], 'medium'),
      evidence_from_cv: str(w?.evidence_from_cv),
      why_it_matters: str(w?.why_it_matters),
    })),
    pathway: arr(j.pathway).map((p, i) => ({
      step: i + 1,
      title: str(p?.title),
      goal: str(p?.goal),
      skills: arr(p?.skills).map(str),
      outcome_for_cv: str(p?.outcome_for_cv),
    })),
    schedule: schedule.map((w, wi) => ({
      week: wi + 1,
      theme: str(w?.theme),
      // IDs are assigned here, not by the AI, so checkbox state stays stable and unique.
      tasks: arr(w?.tasks).map((t, ti) => ({
        id: `w${wi + 1}t${ti + 1}`,
        title: str(t?.title),
        type: oneOf(t?.type, ['learn', 'practice', 'project', 'cv_update'], 'learn'),
        hours: Math.max(0.5, Math.round((Number(t?.hours) || 1) * 2) / 2),
        resource: t?.resource
          ? {
              name: noUrls(t.resource.name),
              platform: noUrls(t.resource.platform),
              format: oneOf(t.resource.format, ['video', 'course', 'docs', 'article', 'practice'], 'course'),
              free: t.resource.free !== false,
              search_query: noUrls(t.resource.search_query) || noUrls(t.resource.name) || str(t?.title),
            }
          : null,
      })),
    })),
    milestone_projects: arr(j.milestone_projects).map((m) => ({
      title: str(m?.title),
      description: str(m?.description),
      skills_proven: arr(m?.skills_proven).map(str),
      cv_bullet_template: str(m?.cv_bullet_template),
    })),
    quick_wins: arr(j.quick_wins).map(str),
  }
}

export const allTaskIds = (plan) => plan.schedule.flatMap((w) => w.tasks.map((t) => t.id))

export function planProgress(plan, completed = []) {
  const ids = allTaskIds(plan)
  if (!ids.length) return 0
  const done = new Set(completed)
  return Math.round((ids.filter((id) => done.has(id)).length / ids.length) * 100)
}

// Pre-fill the target role from the first meaningful line of the job description.
export function guessTargetRole(jobDescription) {
  const line = str(jobDescription)
    .split('\n')
    .map((l) => l.trim())
    .find(Boolean)
  if (!line) return ''
  // "Senior Frontend Engineer - Remote (EU)" -> "Senior Frontend Engineer" (but keep "Full-stack developer")
  return line.replace(/\s+[-–—|·]\s.*$/, '').slice(0, 80) || line.slice(0, 80)
}

// Output token limit for a plan. 4096 is plenty for 2-4 weeks, but longer plans
// get cut off (a 12-week plan failed at 4096), so scale the limit with the length.
export const planMaxTokens = (weeks) => ({ 8: 8192, 12: 12288 })[Number(weeks)] || 4096
