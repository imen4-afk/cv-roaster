// Rough, multilingual (EN/FR/AR) detection of which CV topics the interview has covered.
// A topic counts as covered when the coach asked about it and the user replied,
// or when the user mentioned it themselves.
export const TOPICS = [
  { key: 'target', label: 'Name & target job', re: null },
  { key: 'education', label: 'Education', re: /educat|degree|universit|college|school|bachelor|master|phd|dipl[oô]m|licence|formation|études|etudes|ingénieur|دراس|جامع|شهاد|تعليم|ماستر|ليسانس/i },
  { key: 'experience', label: 'Experience', re: /experience|expérience|worked|employ|intern|company|role|position|stage|entreprise|poste|emploi|خبر|عمل|شرك|تدريب|وظيف/i },
  { key: 'projects', label: 'Projects', re: /project|projet|built|developed|مشروع|مشاريع/i },
  { key: 'skills', label: 'Skills', re: /skill|compétence|competence|tools|technolog|outils|logiciel|مهار|أدوات|تقني/i },
  { key: 'results', label: 'Measurable results', re: /\d+\s?(%|k\b|users|clients|customers|utilisateurs|€|\$|dzd|da\b)|percent|increase|reduc|improv|augment|réduit|impact|result|résultat|نتائج|زياد|نسب|تحسين/i },
  { key: 'languages', label: 'Languages', re: /language|langue|anglais|english|french|français|arabic|arabe|لغ|الإنجليزية|الفرنسية/i },
  { key: 'certifications', label: 'Certifications', re: /certif|course|cours|training|شهادات|دورة|دورات/i },
  { key: 'extras', label: 'Volunteering & achievements', re: /volunt|bénévol|benevol|association|club|award|prize|prix|achievement|réussite|hackathon|تطوع|جائز|إنجاز|نادي/i },
  { key: 'goals', label: 'Career goals', re: /goal|objecti|ambition|aspir|future|avenir|career|carrière|carriere|هدف|أهداف|طموح|مستقبل/i },
]

export function coveredTopics(messages) {
  const covered = new Set()
  const userCount = messages.filter((m) => m.role === 'user').length
  if (userCount >= 1) covered.add('target')

  messages.forEach((m, i) => {
    for (const t of TOPICS) {
      if (!t.re || covered.has(t.key)) continue
      // Skip the static greeting (index 0), which mentions "job" generically.
      if (m.role === 'assistant' && i > 0 && t.re.test(m.content) && messages[i + 1]?.role === 'user') covered.add(t.key)
      if (m.role === 'user' && t.re.test(m.content)) covered.add(t.key)
    }
  })
  return covered
}
