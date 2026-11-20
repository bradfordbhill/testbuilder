# testbuilder
Geometry Test and Quiz Builder

A browser-only app for building geometry tests and quizzes for UHS Honors Geometry (Imagine IM Geometry). It needs no server or accounts. Everything is saved in your browser, and you can export and import it as JSON.

## Features

- **Add question**: six question types:
  - short / numeric answer
  - free response
  - two-column or paragraph proof, with fill-in-the-blank cells
  - True/False or Always/Sometimes/Never
  - matching
  - multiple choice

  Each question has a live student-copy and answer-key preview, a notation palette (∠, △, segment overline, ≅, ∼, ∥, ⊥, √, π…) and a worked-solution field.
- **Topics from the course map**: every question is tagged with lesson codes (e.g. `3B.9`). You pick them from a searchable list of units, sections and lessons. The list is built from `src/data/course-map.yaml`, so editing that file updates the app.
- **Diagrams built in place**: start from a template or a blank canvas, then:
  - drag points
  - add segments, lines, rays, circles, arcs, angle marks, right-angle marks, shaded regions and text
  - set congruence tick marks, parallel arrows and labels such as `(3x + 5)°`
  - turn on a coordinate grid

  Labels are placed automatically and can be adjusted.
- **Random problem generators (Units 1–4)**: 42 generators, with the algebra folded into the geometry. Many have options; for example, any short-answer problem with distractors can be turned into multiple choice. They cover:
  - angle relationships and parallel lines (including the converse)
  - triangle angle sum and exterior angles
  - isosceles triangles
  - parallelograms, rectangles, rhombuses, kites and isosceles trapezoids (trapezoid is exclusive)
  - the Perpendicular Bisector Theorem
  - congruence criteria
  - two-column congruence and similarity proofs written with the course's reason wording
  - dilations, midsegments, side splitter (with an honors quadratic version) and similar triangles
  - Pythagorean Theorem and its converse
  - altitude to the hypotenuse
  - mirror and shadow problems
  - special right triangles
  - cos/sin/tan in the course order
  - angles of elevation and depression
  - cofunctions and the Pythagorean Identity
  - inscribed regular polygons
  - radians, arc length and sectors
  - unit circle values, reference angles and coterminal angles
  - ½ab sin C
  - Law of Sines, including the ambiguous case
  - Law of Cosines
  - Heron's Formula
- **Tests**:
  - sections, per-item points and page breaks
  - a header with name, date and period lines
  - up to six versions (Forms A–F); generated questions get new numbers in each form, and question order can be shuffled
- **Print**: student copies and answer keys (with optional worked solutions) for each form. Print or save as PDF from the browser.

## Running it

```bash
npm install
npm run dev      # local development server
npm test         # generator test suite
npm run build    # static site in dist/ (open from any folder or host on GitHub Pages)
```

## Project layout

| Path | What it is |
| --- | --- |
| `src/data/course-map.yaml` | Course topic map (units, sections, lessons, terms, theorems) |
| `src/model/types.ts` | Question, diagram and test data model |
| `src/gen/unit1.ts` … `unit4.ts` | Problem generators, by unit |
| `src/diagram/` | SVG diagram renderer, editor and templates |
| `src/pages/` | Question bank, editor, generator browser, test builder, print view, course map |

## Adding a generator

Write a `Generator` (see `src/gen/types.ts`) with the lesson codes it practices and a `generate(rng, options)` function that returns a problem. Use the seeded `rng` for all randomness so that test versions can be reproduced. Then add it to the unit's list. `src/gen/generators.test.ts` automatically checks every generator across many seeds.
