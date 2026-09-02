export function getDeviceId() {
  let id = localStorage.getItem('ihg_device_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('ihg_device_id', id)
  }
  return id
}

const BLOCKED_WORDS = ['badword1', 'badword2']

export function containsProfanity(text) {
  const lower = text.toLowerCase()
  return BLOCKED_WORDS.some((w) => lower.includes(w))
}

export function hasAgreed() {
  return localStorage.getItem('ihg_agreed') === 'true'
}

export function setAgreed() {
  localStorage.setItem('ihg_agreed', 'true')
}

export async function sha256Hex(file) {
  const buf = await file.arrayBuffer()
  const hashBuf = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const GRADES = ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11']

export const SUBJECTS = [
  'Physical Education',
  'Chinese Language and Literature',
  'Chinese Language and Acquisition',
  'English Language and Literature',
  'English Language and Acquisition',
  'Design',
  'Mathematics',
  'Extended Mathematics',
  'Mathematics (Standard)',
  'Science',
  'Chinese Humanities LL',
  'Chinese Humanities LA',
  'Arts',
  'Individuals and Societies',
  'Information Technology (IT)',
]
