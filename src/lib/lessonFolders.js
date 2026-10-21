// Grade-band subject lists. These now apply everywhere a grade+subject is
// picked (Upload, Browse, Discussions, Requests) — not just Lesson Slides.

export const GRADE_BANDS = [
  { id: 'Grade 6', subtitle: 'Foundation Years' },
  { id: 'Grades 7-8', subtitle: 'Middle Years' },
  { id: 'Grade 9', subtitle: 'Bridge to Diploma' },
]

const G78_SUBJECTS = [
  'Physical Education',
  'Chinese Language and Literature',
  'Chinese Language and Acquisition',
  'English Language and Literature',
  'English Language and Acquisition',
  'Design',
  'Mathematics',
  'Science',
  'Chinese Humanities LL',
  'Chinese Humanities LA',
  'Arts',
  'Individuals and Societies',
]

// Grade 6 only has plain "Chinese" and "English" -- no Language & Literature /
// Language & Acquisition split (that starts in Grade 7), and no LL/LA
// Chinese Humanities split either.
const G6_SUBJECTS = [
  'Physical Education',
  'Chinese',
  'English',
  'Design',
  'Mathematics',
  'Science',
  'Chinese Humanities',
  'Arts',
  'Individuals and Societies',
  'Information Technology (IT)',
]

const G9_SUBJECTS = [
  'Extended Mathematics',
  'Mathematics (Standard)',
  'Chinese Language and Acquisition',
  'Chinese Language and Literature',
  'English Language and Literature',
  'English Language and Acquisition',
  'Chinese Humanities LL',
  'Chinese Humanities LA',
  'Science',
  'Individuals and Societies',
  'Physical Education',
]

// Grade 10/11 curricula haven't been finalised yet (see the terms modal) —
// this is a reasonable general placeholder list until that's set.
const FALLBACK_SUBJECTS = [
  'English Language and Literature', 'English Language and Acquisition',
  'Chinese Language and Literature', 'Chinese Language and Acquisition',
  'Individuals and Societies', 'Design', 'Mathematics', 'Science', 'Arts', 'Chinese Humanities',
]

export const SUBJECTS_BY_BAND = {
  'Grade 6': [...G6_SUBJECTS],
  'Grades 7-8': [...G78_SUBJECTS],
  'Grade 9': [...G9_SUBJECTS, 'Courses'],
}

export function subjectsForGrade(grade) {
  if (grade === 'Grade 6') return G6_SUBJECTS
  if (grade === 'Grade 7' || grade === 'Grade 8') return G78_SUBJECTS
  if (grade === 'Grade 9') return G9_SUBJECTS
  return FALLBACK_SUBJECTS
}

// Deduplicated union, for pages with no grade selector (Discussions, Requests)
export const ALL_SUBJECTS = [...new Set([...G6_SUBJECTS, ...G78_SUBJECTS, ...G9_SUBJECTS])]

// Two entries in your original Grade 9 Courses list looked run-together or
// cut off when pasted — I split the first and left the second as sent;
// please check that one against your source.
export const GRADE9_COURSES = [
  'Digital Design 數碼設計',
  'Shuyuan Geoscience 書院地球科學',
  'Classical Music: Exploring Style and Structure 古典音樂：探索風格與結構',
  'Popular Music: Performance and Appreciation 流行音樂：表演與欣賞',
  "Visual Arts - Breaking the Rules 打破常規",
  "Visual Arts - Nature's Blueprint: Art and Anatomy and Architecture 自然的藍圖：解剖學與建築的藝術",
  "Theatre - That's Lit!(erature) 那就是文學！",
  "Theatre - That's Showbiz 這就",
  'MYP Design MYP 設計',
  'Shuyuan Applied Architecture and Space 書院應用建築與空間',
  'Shuyuan Chinese Classical Literature 書院中國古典文學',
  'Shuyuan Comparative Classics 書院經典比較',
  'Shuyuan Comparative Politics 書院比較政治',
  'Shuyuan Environmental Studies 書院環境研究',
  'Shuyuan Filmmaking 書院電影製作',
  'Complex Mathematical Concepts 複雜數學概念',
  'Shuyuan Biotechnology 書院生物科技',
  'Shuyuan Computer Science 書院計算機科學',
  'Shuyuan Latin 書院拉丁文',
  'Shuyuan Mathematics for Engineering 書院工程數學',
]
