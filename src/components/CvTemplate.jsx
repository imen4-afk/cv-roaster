import { asText, contactEntries } from '../lib/cvText'

function Heading({ children }) {
  return (
    <h2 className="mb-2 mt-5 border-b-2 border-orange-500 pb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-800">
      {children}
    </h2>
  )
}

function Bullets({ items }) {
  if (!items?.length) return null
  return (
    <ul className="mt-1 list-disc space-y-0.5 ps-5 text-[13px] leading-snug text-neutral-700 marker:text-orange-500">
      {items.map((b, i) => (
        <li key={i}>{asText(b)}</li>
      ))}
    </ul>
  )
}

function Entry({ title, subtitle, dates, children }) {
  return (
    <div className="avoid-break mb-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="text-[14px] font-semibold text-neutral-900">
          {title}
          {subtitle && <span className="font-normal text-neutral-600"> · {subtitle}</span>}
        </p>
        {dates && <p className="text-[12px] text-neutral-500">{dates}</p>}
      </div>
      {children}
    </div>
  )
}

// A clean, white, one-page CV that also prints well.
export default function CvTemplate({ cv }) {
  const contacts = contactEntries(cv.contact)
  return (
    <article
      dir="auto"
      className="print-area mx-auto w-full max-w-[210mm] rounded-xl bg-white p-6 text-neutral-900 shadow-2xl shadow-black/50 sm:p-10"
    >
      <header className="border-b border-neutral-200 pb-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">{cv.full_name}</h1>
        {cv.title && <p className="mt-0.5 text-[15px] font-medium text-orange-600">{cv.title}</p>}
        {contacts.length > 0 && (
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-neutral-600">
            {contacts.map(([k, v]) => (
              <span key={k}>{v}</span>
            ))}
          </p>
        )}
      </header>

      {cv.summary && (
        <>
          <Heading>Summary</Heading>
          <p className="text-[13px] leading-relaxed text-neutral-700">{cv.summary}</p>
        </>
      )}

      {cv.experience.length > 0 && (
        <>
          <Heading>Experience</Heading>
          {cv.experience.map((e, i) =>
            typeof e === 'string' ? (
              <p key={i} className="text-[13px]">{e}</p>
            ) : (
              <Entry key={i} title={e.role} subtitle={e.org} dates={e.dates}>
                <Bullets items={e.bullets} />
              </Entry>
            ),
          )}
        </>
      )}

      {cv.projects.length > 0 && (
        <>
          <Heading>Projects</Heading>
          {cv.projects.map((p, i) =>
            typeof p === 'string' ? (
              <p key={i} className="text-[13px] text-neutral-700">{p}</p>
            ) : (
              <Entry key={i} title={p.name} dates={p.dates}>
                {p.description && <p className="text-[13px] text-neutral-700">{p.description}</p>}
                <Bullets items={p.bullets} />
              </Entry>
            ),
          )}
        </>
      )}

      {cv.education.length > 0 && (
        <>
          <Heading>Education</Heading>
          {cv.education.map((e, i) =>
            typeof e === 'string' ? (
              <p key={i} className="text-[13px]">{e}</p>
            ) : (
              <Entry key={i} title={e.degree} subtitle={e.school} dates={e.dates}>
                {e.details && <p className="text-[13px] text-neutral-700">{e.details}</p>}
              </Entry>
            ),
          )}
        </>
      )}

      <div className="grid gap-x-8 sm:grid-cols-2 print:grid-cols-2">
        {cv.skills.length > 0 && (
          <div>
            <Heading>Skills</Heading>
            <div className="flex flex-wrap gap-1.5">
              {cv.skills.map((s, i) => (
                <span key={i} className="rounded border border-neutral-300 px-2 py-0.5 text-[12px] text-neutral-700">
                  {asText(s)}
                </span>
              ))}
            </div>
          </div>
        )}
        {(cv.languages.length > 0 || cv.certifications.length > 0) && (
          <div>
            {cv.languages.length > 0 && (
              <>
                <Heading>Languages</Heading>
                <p className="text-[13px] text-neutral-700">{cv.languages.map(asText).join(' · ')}</p>
              </>
            )}
            {cv.certifications.length > 0 && (
              <>
                <Heading>Certifications</Heading>
                <Bullets items={cv.certifications} />
              </>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
