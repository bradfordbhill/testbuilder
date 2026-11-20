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
- **Random problem generators (Units 1–4)**: 68 generators, with the algebra folded into the geometry. Many have options; for example, any short-answer problem with distractors can be turned into multiple choice. They cover:
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

## Problem-type catalog

`src/data/problem-types.yaml` lists the 85 problem types seen in the decks, homework and assessments (PRF, CRIT, ANG, ALG, QUAD, TRF, CON, LOC, DIL, SIM, PYTH, SRT, TRIG, POLY, RAD, UC, OBL, TASK).

- **Tagging**: every generator declares the catalog types it produces, so generated questions are tagged automatically. Written questions get types in the editor; the types listed for the question's lessons are suggested first.
- **Coverage page** (press **P**): for each type it shows the generators, bank count, test count, and the catalog's task, formats, misconceptions and where it was seen. Each type is labeled as having generators, a gap, write by hand (open proofs and derivations) or classroom only (constructions and routines). Every generatable Unit 1–4 type has at least one generator; a test enforces this.
- **Balance** (test builder): a test's points broken down by family, response format and unit, a tally of its types, and the types its lessons include but the test does not, each with a one-click link to generate it or write it by hand.
- **Bank filter**: filter by problem type, or search types from the command palette.

## Working fast

- **Command palette**: press **Ctrl K** (⌘K on Mac) to jump to any test, question, generator or lesson, to create things, or to paste a debug code.
- **Keyboard shortcuts** (press **?** to see them all):
  - **B**, **G**, **T**, **C** go to the bank, Generate, Tests and Topics.
  - **N** starts a new question; **/** focuses the page's search box.
  - In the bank, **↑ ↓** move through questions, **Enter** edits, **Space** previews, **X** selects and **Shift-click** selects a range.
  - In the editor, **Ctrl S** saves and **Alt 1–4** switch tabs.
- **Drag and drop**:
  - The test builder is a split view: drag questions from the **Bank** or **Generate** panel into the test, exactly where you want them, and drag to reorder within or between sections.
  - In the editor, drag to reorder proof rows, choices, matching pairs, T/F statements and answer blanks.
  - Drag handles also work from the keyboard: focus a handle, press Space, use the arrow keys, then press Space again.
- **Undo**: deleting questions or tests, removing items or sections, and removing a diagram all show an **Undo** button instead of asking "are you sure?".

## Debug codes

Every question shows a small gray debug code in the builder: in the bank, the editor, generator previews, the test builder and the on-screen print preview. Codes are never printed. Click a code to copy it.

- `G:<generator>:<seed>[:options][:edited]` is a generated question. The code reproduces it exactly, including the numbers used on Forms B, C…. `edited` means the question was changed by hand after it was generated.
- `Q:<id>` is a hand-written question.

To find a bad output, copy its code and paste it into **Generate → Look up a debug code**. That regenerates the identical problem, or opens the hand-written question. When reporting a problem, include the code.

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

## Hosting (GitHub Pages)

`.github/workflows/deploy-pages.yml` builds, tests and publishes the site on every push to `main`. It can also be run by hand from the Actions tab. The site is served at <https://bradfordbhill.github.io/testbuilder/>.

One-time setup: in the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.
