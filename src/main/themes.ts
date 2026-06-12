// Comment theme taxonomy + keyword classifier. Pure module — no electron or
// database imports — so it can be unit-tested directly and reused by the
// query layer (src/main/queries/themes.ts).

export interface ThemeDef {
  /** Stable key used by the query layer and the renderer. */
  key: string;
  /** Human-readable name shown on the Themes page. */
  name: string;
  /** lucide icon name (kebab-case); the renderer maps this to a component. */
  icon: string;
  /** Lowercase keywords/phrases, matched word-boundary-aware. Plurals and
   *  spelling variants are listed explicitly because \b-anchored matching
   *  deliberately does NOT do stemming ('exam' must not match 'example',
   *  so 'exams' needs its own entry). */
  keywords: string[];
}

export const THEMES: ThemeDef[] = [
  {
    key: 'assessment',
    name: 'Assessment',
    icon: 'clipboard-check',
    keywords: [
      'assignment', 'assignments', 'assessment', 'assessments',
      'exam', 'exams', 'quiz', 'quizzes', 'rubric', 'rubrics',
      'marking', 'marked', 'grading', 'grade', 'grades', 'feedback',
    ],
  },
  {
    key: 'workload',
    name: 'Workload',
    icon: 'gauge',
    keywords: [
      'workload', 'too much', 'overwhelming', 'overwhelmed',
      'time-consuming', 'time consuming', 'pace', 'fast-paced',
      'heavy', 'demanding', 'deadline', 'deadlines', 'overloaded',
      'not enough time', 'stressful',
    ],
  },
  {
    key: 'teaching',
    name: 'Teaching',
    icon: 'graduation-cap',
    keywords: [
      'lecturer', 'lecturers', 'teacher', 'teachers', 'teaching',
      'tutor', 'tutors', 'instructor', 'instructors', 'lecture',
      'lectures', 'taught', 'explained', 'explanation', 'explanations',
    ],
  },
  {
    key: 'content',
    name: 'Content',
    icon: 'book-open',
    keywords: [
      'content', 'material', 'materials', 'topic', 'topics',
      'curriculum', 'syllabus', 'theory', 'concept', 'concepts',
      'outdated', 'relevant', 'irrelevant', 'real-world',
    ],
  },
  {
    key: 'resources',
    name: 'Resources',
    icon: 'library',
    keywords: [
      'resource', 'resources', 'textbook', 'textbooks', 'readings',
      'slides', 'lecture notes', 'notes', 'recording', 'recordings',
      'video', 'videos', 'examples', 'library',
    ],
  },
  {
    key: 'organisation',
    name: 'Organisation',
    icon: 'calendar-clock',
    keywords: [
      'organised', 'organized', 'organisation', 'organization',
      'disorganised', 'disorganized', 'structure', 'structured',
      'unstructured', 'schedule', 'scheduling', 'timetable',
      'planning', 'layout',
    ],
  },
  {
    key: 'communication',
    name: 'Communication',
    icon: 'message-circle',
    keywords: [
      'communication', 'communicate', 'communicated', 'announcement',
      'announcements', 'email', 'emails', 'respond', 'responded',
      'response time', 'reply', 'replies', 'informed', 'contactable',
    ],
  },
  {
    key: 'support',
    name: 'Support',
    icon: 'heart-handshake',
    keywords: [
      'support', 'supported', 'supportive', 'help', 'helpful', 'helped',
      'approachable', 'available', 'availability', 'office hours',
      'guidance', 'assistance', 'mentoring', 'consultation',
    ],
  },
  {
    key: 'technology',
    name: 'Technology',
    icon: 'laptop',
    keywords: [
      'blackboard', 'canvas', 'moodle', 'online', 'website',
      'technology', 'technical', 'zoom', 'internet', 'platform',
      'software', 'computer', 'echo360', 'ilecture',
    ],
  },
];

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// One precompiled regex per theme: \b(kw1|kw2|...)\b over the lowercased
// comment. \b at the outer edges is sensible because every keyword starts and
// ends with a word character; hyphens/spaces inside phrases don't affect it.
const THEME_MATCHERS: ReadonlyArray<{ key: string; re: RegExp }> = THEMES.map((t) => ({
  key: t.key,
  re: new RegExp(`\\b(?:${t.keywords.map(escapeRegExp).join('|')})\\b`),
}));

/**
 * Classify a comment into zero or more theme keys. A comment can match
 * several themes; returns [] when nothing matches.
 */
export function classifyComment(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  return THEME_MATCHERS.filter((m) => m.re.test(lower)).map((m) => m.key);
}
