const LINKS = [
  { name: 'Khan Academy', url: 'https://www.khanacademy.org', subject: 'All subjects' },
  { name: 'Dr Frost Maths (DFM)', url: 'https://www.drfrostmaths.com', subject: 'Mathematics' },
  { name: 'Mathspace', url: 'https://mathspace.co', subject: 'Mathematics' },
  { name: 'Quizlet', url: 'https://quizlet.com', subject: 'All subjects' },
  { name: 'BBC Bitesize', url: 'https://www.bbc.co.uk/bitesize', subject: 'All subjects' },
]

export default function StudyLinks() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl mb-2">Study links</h1>
      <p className="font-body text-sm text-inkSoft mb-8">
        Safe, external, official study sites — nothing hosted here, just pointers.
      </p>
      <div className="divide-y divide-ink/15 border-t border-b border-ink/15">
        {LINKS.map((l) => (
          <a
            key={l.name}
            href={l.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between py-4 hover:bg-parchmentDark px-2 transition-colors"
          >
            <span className="font-display text-lg">{l.name}</span>
            <span className="stamp text-xs text-inkSoft">{l.subject}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
