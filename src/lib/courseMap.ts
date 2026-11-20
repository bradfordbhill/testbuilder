import { load } from 'js-yaml'
import raw from '../data/course-map.yaml?raw'

export interface Lesson {
  code: string
  unit: number
  section: string
  number: number
  title: string
  optional: boolean
  source: 'TG' | 'teacher-addition'
  topics: string[]
  newTerms: string[]
  theorems: string[]
  skills: string[]
  honors: string[]
}

export interface Section {
  letter: string
  title: string
  lessons: Lesson[]
}

export interface Unit {
  unit: number
  title: string
  status: string
  detailLevel: string
  sections: Section[]
  /** Unit-level topic list (units described by titles only). */
  topics: string[]
  notes: string[]
}

export interface CourseMap {
  name: string
  year: string
  notation: string[]
  units: Unit[]
  lessons: Lesson[]
  byCode: Map<string, Lesson>
}

type Dict = Record<string, unknown>

const asArray = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : [])

export function parseCourseMap(text: string): CourseMap {
  const doc = load(text) as Dict
  const course = (doc.course ?? {}) as Dict
  const units: Unit[] = []
  const lessons: Lesson[] = []

  for (const u of (doc.units ?? []) as Dict[]) {
    const unitNo = Number(u.unit)
    const sectionsRaw = (u.sections ?? {}) as Dict
    const sections: Section[] = Object.entries(sectionsRaw).map(([letter, s]) => {
      let title: string
      if (typeof s === 'string') title = s.replace(/\s*\(\d+(-\d+)?\)\s*$/, '')
      else title = String((s as Dict).title ?? letter)
      return { letter, title, lessons: [] }
    })

    for (const l of (u.lessons ?? []) as Dict[]) {
      const code = String(l.code)
      const m = /^(\d+)([A-Z])\.(\d+)$/.exec(code)
      if (!m) continue
      const lesson: Lesson = {
        code,
        unit: unitNo,
        section: m[2],
        number: Number(m[3]),
        title: String(l.title ?? ''),
        optional: l.optional === true,
        source: l.source === 'teacher-addition' ? 'teacher-addition' : 'TG',
        topics: asArray(l.topics),
        newTerms: asArray(l.new_terms),
        theorems: asArray(l.theorems),
        skills: asArray(l.skills),
        honors: asArray(l.honors),
      }
      lessons.push(lesson)
      let sec = sections.find((s) => s.letter === lesson.section)
      if (!sec) {
        sec = { letter: lesson.section, title: lesson.section, lessons: [] }
        sections.push(sec)
      }
      sec.lessons.push(lesson)
    }

    const notes: string[] = []
    for (const key of ['note', 'overlap_note', 'keep_full_strength', 'wishlist']) {
      if (typeof u[key] === 'string') notes.push(u[key] as string)
    }

    units.push({
      unit: unitNo,
      title: String(u.title ?? `Unit ${unitNo}`),
      status: String(u.status ?? ''),
      detailLevel: String(u.detail_level ?? ''),
      sections,
      topics: asArray(u.topics),
      notes,
    })
  }

  return {
    name: String(course.name ?? 'Geometry'),
    year: String(course.year ?? ''),
    notation: asArray(doc.notation_and_language),
    units,
    lessons,
    byCode: new Map(lessons.map((l) => [l.code, l])),
  }
}

export const courseMap: CourseMap = parseCourseMap(raw)

/** Every searchable phrase attached to a lesson. */
export function lessonKeywords(l: Lesson): string[] {
  return [l.title, ...l.topics, ...l.newTerms, ...l.theorems, ...l.skills, ...l.honors]
}

/** Compare lesson codes in course order. */
export function compareCodes(a: string, b: string): number {
  const la = courseMap.byCode.get(a)
  const lb = courseMap.byCode.get(b)
  if (!la || !lb) return a.localeCompare(b)
  return la.unit - lb.unit || la.number - lb.number
}
