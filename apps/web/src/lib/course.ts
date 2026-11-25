/** The subject a student is learning now. A convenience of this device; every level is checked by the API. */
const KEY = 'last-lesson-course';

export function chosenCourse(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function chooseCourse(subjectId: string) {
  try {
    localStorage.setItem(KEY, subjectId);
  } catch {
    /* private mode */
  }
}
