/**
 * Hash router — pure parse/format so every screen has a URL and refresh
 * returns you to the same place (Phase 2 §5). No library: the app's view
 * union IS the route model; these two functions are fully unit-tested.
 */
export type View =
  | { kind: 'welcome' }
  | { kind: 'path' }
  | { kind: 'journey' }
  | { kind: 'roadmap' }
  | { kind: 'review' }
  | { kind: 'readiness' }
  | { kind: 'skills' }
  | { kind: 'admin' }
  | { kind: 'trainer' }
  | { kind: 'manager' }
  | { kind: 'lesson'; moduleId: string; lessonId: string }
  | { kind: 'exam'; moduleId: string }
  | { kind: 'boss'; bossId: string }
  | { kind: 'readiness_report'; employeeId: string };

export function toHash(v: View): string {
  switch (v.kind) {
    case 'welcome': return '#/welcome';
    case 'path': return '#/';
    case 'journey': return '#/journey';
    case 'roadmap': return '#/roadmap';
    case 'review': return '#/review';
    case 'readiness': return '#/readiness';
    case 'skills': return '#/skills';
    case 'admin': return '#/admin';
    case 'trainer': return '#/trainer';
    case 'manager': return '#/manager';
    case 'lesson': return `#/lesson/${v.moduleId}/${v.lessonId}`;
    case 'exam': return `#/exam/${v.moduleId}`;
    case 'boss': return `#/boss/${v.bossId}`;
    case 'readiness_report': return `#/readiness-report/${v.employeeId}`;
  }
}

export function parseHash(hash: string): View {
  // An overlay open over the screen rides in the query (`#/manager?file=…`,
  // see overlayHistory); the screen itself is the path before it.
  const parts = hash.replace(/^#\/?/, '').split('?')[0]!.split('/').filter(Boolean);
  switch (parts[0]) {
    case 'welcome': return { kind: 'welcome' };
    case 'journey': return { kind: 'journey' };
    case 'roadmap': return { kind: 'roadmap' };
    case 'review': return { kind: 'review' };
    case 'readiness': return { kind: 'readiness' };
    case 'skills': return { kind: 'skills' };
    case 'admin': return { kind: 'admin' };
    case 'trainer': return { kind: 'trainer' };
    case 'manager': return { kind: 'manager' };
    case 'lesson':
      return parts[1] && parts[2] ? { kind: 'lesson', moduleId: parts[1], lessonId: parts[2] } : { kind: 'path' };
    case 'exam':
      return parts[1] ? { kind: 'exam', moduleId: parts[1] } : { kind: 'path' };
    case 'boss':
      return parts[1] ? { kind: 'boss', bossId: parts[1] } : { kind: 'path' };
    case 'readiness-report':
      return parts[1] ? { kind: 'readiness_report', employeeId: parts[1] } : { kind: 'manager' };
    default: return { kind: 'path' };
  }
}
