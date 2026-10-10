// Links to learning resources are built here from platform + search_query.
// We never use URLs written by the AI: they are often made up or broken.

const SITE_SEARCH = [
  { match: ['youtube'], url: (q) => `https://www.youtube.com/results?search_query=${q}` },
  { match: ['coursera'], url: (q) => `https://www.coursera.org/search?query=${q}` },
  { match: ['edx'], url: (q) => `https://www.edx.org/search?q=${q}` },
  { match: ['mdn', 'mozilla'], url: (q) => `https://developer.mozilla.org/en-US/search?q=${q}` },
  { match: ['microsoft'], url: (q) => `https://learn.microsoft.com/en-us/search/?terms=${q}` },
  { match: ['kaggle'], url: (q) => `https://www.kaggle.com/search?q=${q}` },
  { match: ['freecodecamp'], url: (q) => `https://www.freecodecamp.org/news/search/?query=${q}` },
  { match: ['github'], url: (q) => `https://github.com/search?type=repositories&q=${q}` },
  { match: ['udemy'], url: (q) => `https://www.udemy.com/courses/search/?q=${q}` },
  { match: ['khanacademy'], url: (q) => `https://www.khanacademy.org/search?page_search_query=${q}` },
  { match: ['linkedinlearning'], url: (q) => `https://www.linkedin.com/learning/search?keywords=${q}` },
]

const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

export function resourceLink(resource) {
  const platform = String(resource?.platform || '').trim()
  const query = String(resource?.search_query || resource?.name || '').trim()
  const key = normalize(platform)
  const site = key && SITE_SEARCH.find((s) => s.match.some((m) => key.includes(m)))
  if (site && query) return site.url(encodeURIComponent(query))
  // roadmap.sh, The Odin Project, TryHackMe, official docs, etc.: no reliable site search URL.
  return `https://www.google.com/search?q=${encodeURIComponent(`${platform} ${query}`.trim())}`
}
