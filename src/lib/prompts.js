export const COACH_SYSTEM_PROMPT = `You are a career coach collecting information to write a CV. You ONLY discuss career topics: education, experience, projects, skills, certifications, languages, volunteering, achievements and career goals. If the user asks about anything else, politely refuse in one sentence and bring them back to their CV. Ask ONE question at a time, short and friendly. Start by asking their name and the job they are targeting. Dig for measurable results (numbers, impact). When you have enough information (about 8-12 answers), say exactly: READY_TO_GENERATE.

Reply in the user's language (English, French or Arabic), but always write READY_TO_GENERATE in English.`

export const READY_TOKEN = 'READY_TO_GENERATE'

export const COACH_GREETING =
  "Hi! 👋 I'm your CV coach. Let's build your CV together, one question at a time. To start: what's your name, and what job are you targeting? (You can answer in English, French or Arabic.)"

export function roastPrompt(cvText, jobDescription) {
  const target = jobDescription?.trim()
    ? `TARGET JOB DESCRIPTION:\n"""\n${jobDescription.trim()}\n"""`
    : 'No target job description was given: judge the CV against general recruiter and ATS expectations for the role it seems to aim at.'

  return `You are a brutally honest but constructive senior recruiter and ATS expert. Roast the CV below.

${target}

CV:
"""
${cvText.trim()}
"""

Return ONLY a JSON object with EXACTLY this shape:
{
  "score": integer 0-100 (overall quality and fit; be strict, an average CV is around 55),
  "verdict": "one punchy sentence",
  "roast": ["blunt but constructive feedback points, 4-7 items, each specific to this CV"],
  "strengths": ["2-5 genuine strengths"],
  "weakest_bullet": { "original": "the weakest bullet/line copied verbatim from the CV", "rewritten": "a stronger version: active voice, strong verb, measurable impact (use placeholders like [X%] instead of inventing numbers)", "why_better": "short explanation" },
  "mismatch": [ { "issue": "...", "why_it_wont_match": "...", "how_to_fix": "..." } ],
  "missing_keywords": ["keywords/skills recruiters or ATS would look for that are absent"]
}

"mismatch" explains why this CV would not match the target job (or general recruiter/ATS expectations if no job description is given): give 2-5 items.
Write all text values in the same language as the CV.`
}

export function generateCvPrompt(conversation) {
  const transcript = conversation
    .map((m) => `${m.role === 'assistant' ? 'COACH' : 'CANDIDATE'}: ${m.content}`)
    .join('\n')

  return `You are an expert CV writer. Using ONLY the facts in the interview transcript below, write a professional one-page CV.

TRANSCRIPT:
"""
${transcript}
"""

Return ONLY a JSON object with EXACTLY this shape:
{
  "full_name": "...",
  "title": "target job title",
  "contact": { "email": "", "phone": "", "location": "", "linkedin": "", "website": "" },
  "summary": "2-3 sentence professional summary",
  "experience": [ { "role": "...", "org": "...", "dates": "...", "bullets": ["..."] } ],
  "education": [ { "degree": "...", "school": "...", "dates": "...", "details": "" } ],
  "projects": [ { "name": "...", "description": "...", "bullets": ["..."] } ],
  "skills": ["..."],
  "languages": ["Language (level)"],
  "certifications": ["..."]
}

Rules:
- Bullets must use active voice, start with strong action verbs, and include numbers when the candidate gave them.
- NEVER invent facts, employers, dates, numbers, contact details or skills the candidate did not provide. Leave a field as "" or an array empty if unknown.
- Fold volunteering into "experience" and notable achievements into the relevant bullets.
- Write the CV in the language the candidate mostly used.`
}

// --- Validators: throw on bad shape, return a normalized object ---

const arr = (v) => (Array.isArray(v) ? v : [])
const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v))

export function validateRoast(j) {
  if (!j || typeof j !== 'object') throw new Error('not an object')
  const score = Number(j.score)
  if (!Number.isFinite(score)) throw new Error('missing score')
  if (!j.verdict) throw new Error('missing verdict')
  const wb = j.weakest_bullet || {}
  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    verdict: str(j.verdict),
    roast: arr(j.roast).map(str),
    strengths: arr(j.strengths).map(str),
    weakest_bullet: { original: str(wb.original), rewritten: str(wb.rewritten), why_better: str(wb.why_better) },
    mismatch: arr(j.mismatch).map((m) => ({
      issue: str(m?.issue),
      why_it_wont_match: str(m?.why_it_wont_match),
      how_to_fix: str(m?.how_to_fix),
    })),
    missing_keywords: arr(j.missing_keywords).map(str),
  }
}

export function validateCv(j) {
  if (!j || typeof j !== 'object') throw new Error('not an object')
  if (!j.full_name && !j.title) throw new Error('missing name/title')
  return {
    full_name: str(j.full_name),
    title: str(j.title),
    contact: j.contact && typeof j.contact === 'object' ? j.contact : {},
    summary: str(j.summary),
    experience: arr(j.experience),
    education: arr(j.education),
    projects: arr(j.projects),
    skills: arr(j.skills),
    languages: arr(j.languages),
    certifications: arr(j.certifications),
  }
}
