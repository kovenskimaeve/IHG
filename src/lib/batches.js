// Files uploaded together share a batch_id, so a paper and its answers show up as
// ONE card with both files on it, instead of two near-identical cards.

export const ROLES = [
  { value: 'paper', label: 'Paper' },
  { value: 'answers', label: 'Answers' },
  { value: 'other', label: 'Extra' },
]

export const roleLabel = (role) => ROLES.find((r) => r.value === role)?.label || 'Paper'

// Memo, answer key, mark scheme, solutions -> "answers"; everything else -> "paper".
export function guessRole(filename) {
  return /(memo|answer|mark[\s_-]?scheme|markscheme|solution|\bkey\b|\bms\b)/i.test(filename) ? 'answers' : 'paper'
}

const order = { paper: 0, answers: 1, other: 2 }

// rows: file rows from the `files` table (newest first). Returns one entry per upload batch.
export function groupFiles(rows) {
  const map = new Map()
  for (const f of rows || []) {
    const key = f.batch_id || f.id
    if (!map.has(key)) {
      map.set(key, {
        key,
        id: f.id,
        title: f.title,
        grade: f.grade,
        subject: f.subject,
        type: f.type,
        uploader_name: f.uploader_name,
        created_at: f.created_at,
        download_count: 0,
        files: [],
      })
    }
    const g = map.get(key)
    g.files.push({ id: f.id, role: f.file_role || 'paper', download_count: f.download_count || 0 })
    g.download_count += f.download_count || 0
  }
  const groups = [...map.values()]
  groups.forEach((g) => g.files.sort((a, b) => order[a.role] - order[b.role]))
  return groups
}
