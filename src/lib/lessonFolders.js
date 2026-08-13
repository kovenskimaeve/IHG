// Grade-band folder structure, specific to Lesson Slides only.
// Past papers and study guides keep the simpler flat Grade 6-11 model
// in device.js — this file is only used by LessonSlides.jsx and the
// lesson-slide branch of Upload.jsx.

export const GRADE_BANDS = [
  { id: 'Grade 6', subtitle: 'Foundation Years' },
  { id: 'Grades 7-8', subtitle: 'Middle Years' },
  { id: 'Grade 9', subtitle: 'Bridge to Diploma' },
]

export const SUBJECTS_BY_BAND = {
  'Grade 6': [
    'Physical Education', 'Chinese', 'English', 'Design', 'Mathematics',
    'Science', 'Chinese Humanities', 'Arts', 'Individuals and Societies',
    'Information Technology (IT)',
  ],
  'Grades 7-8': [
    'Physical Education', 'Chinese Language and Literature', 'English Language and Literature',
    'Design', 'Mathematics', 'Science', 'Chinese Humanities LL', 'Arts',
    'Individuals and Societies', 'Chinese Language and Acquisition', 'English Language and Acquisition',
  ],
  'Grade 9': [
    'Physical Education', 'Chinese Language and Literature', 'English Language and Literature',
    'Mathematics', 'Science', 'Chinese Humanities LL', 'Individuals and Societies',
    'Chinese Language and Acquisition', 'English Language and Acquisition', 'Courses',
  ],
}

// Two entries in your original list looked run-together or cut off when
// pasted ("MYP Design.../Shuyuan Applied..." and "That's Showbiz 這就").
// I split the first and left the second as you sent it — please check
// that one against your source before this goes live.
export const GRADE9_COURSES = [
  'Digital Design 數碼設計',
  'Shuyuan Geoscience 書院地球科學',
  'Classical Music: Exploring Style and Structure 古典音樂：探索風格與結構',
  'Popular Music: Performance and Appreciation 流行音樂：表演與欣賞',
  "Visual Arts - Breaking the Rules 打破常規",
  "Visual Arts - Nature's Blueprint: Art and Anatomy and Architecture 自然的藍圖：解剖學與建築的藝術",
  "Theatre - That's Lit!(erature) 那就是文學！",
  "Theatre - That's Showbiz 這就", // check this one — looked cut off in your source
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
