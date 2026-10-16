import { subjectsForGrade, ALL_SUBJECTS, GRADE9_COURSES } from '../lib/lessonFolders'

// Renders <option>s for a subject <select>, scoped to the chosen grade so
// e.g. "Extended Mathematics" only appears for Grade 9, and Grade 6 only
// sees plain "Chinese" / "English". Pass grade="" for "all grades".
// Grade 9 courses are grouped separately underneath the core subjects.
export default function SubjectOptions({ grade = '', optionClassName }) {
  const subjects = grade ? subjectsForGrade(grade) : ALL_SUBJECTS
  const showCourses = !grade || grade === 'Grade 9'
  return (
    <>
      {subjects.map((s) => (
        <option key={s} value={s} className={optionClassName}>{s}</option>
      ))}
      {showCourses && (
        <optgroup label="Grade 9 courses">
          {GRADE9_COURSES.map((c) => (
            <option key={c} value={c} className={optionClassName}>{c}</option>
          ))}
        </optgroup>
      )}
    </>
  )
}
