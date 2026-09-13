# Design document

## Product concept

An adaptive AI tutor that identifies how a student learns best and reshapes every explanation around that style, instead of giving every student the same paragraph of text.

The design goal was to make the adaptation visible, not just functional. When the tool switches from a visual learner to a verbal learner, the interface itself should change shape, not just the words on the page.

## Visual identity

The product is framed as a study companion, not a corporate dashboard. The onboarding quiz happens on a dark chalkboard-style scene, evoking a classroom moment of figuring something out. Once a student enters the main workspace, the surface shifts to a paper-toned, notebook-like canvas, since that is where the actual work of learning happens.

## Color palette

| Token | Hex | Role |
|---|---|---|
| Chalkboard green | #2B3A32 | Onboarding background, sidebar |
| Paper | #F1F3ED | Workspace background |
| Ink | #1F2A3C | Body text on paper |
| Chalk yellow | #F2C94C | Primary accent, visual-mode marker |
| Slate blue | #52708A | Step-by-step mode accent |
| Sage green | #7A9E7E | Example-driven mode accent |
| Brick red | #B8543E | Verbal mode accent |

Each learning style owns exactly one accent color, used consistently across the sidebar, the mode label, and the explanation panel for that style. Color is never used decoratively; it always signals which mode the student is currently viewing.

## Typography

Two typefaces, each with one clear job.

- Fraunces (serif) carries headlines, the quiz questions, and topic titles. It has a handwritten, slightly imperfect quality that fits a learning context, rather than a corporate one.
- IBM Plex Sans carries all body text, buttons, and UI labels. It reads clearly at small sizes and does not compete with Fraunces for attention.

Sentence case is used throughout. No all-caps labels, no unnecessary eyebrow text above headings.

## Layout

- Landing and quiz screens are full-bleed, single-column, and left-aligned, matching the pace of a one-question-at-a-time conversation.
- The workspace uses a fixed sidebar (profile radar chart, mode switcher, recent topics) plus a flexible main panel. This mirrors a study desk: reference material on the left, active work on the right.
- Line lengths in the explanation panel stay under roughly 70 characters for readability.

## The micro-card system

Any topic or uploaded PDF is broken into a variable-length sequence of small cards, as few or as many as the material actually calls for, rather than one long block of text. Every card carries the same four underlying elements: a visual map, a big idea, key pieces, and a real-world analogy. The student's learning style decides which element leads and how the card is laid out, not which elements exist. This keeps the personalization visible without hiding information from any one type of learner.

- Visual: the visual map leads, shown as a short sequence of connected points with unfilled circular markers, meant to be read as a diagram in words. The big idea sits underneath as a caption.
- Verbal: the analogy leads, set in italics in the display typeface like a pull-quote, followed by the big idea in plain narrative.
- Example-driven: the big idea leads, followed by the key pieces reframed as a worked example in a shaded card, then a short practice prompt in a dashed-border card.
- Step-by-step: the card sequence itself embodies the steps. Each card is labeled "step X of Y," and its key pieces are shown as a plain list with no additional framing.

Each mode has a distinct visual rhythm so that switching modes feels like switching media, not just switching a label. Progress through the card sequence is shown as a row of thin bars above the card, and forward and back controls sit beneath it.

## Interaction principles

- Motion is minimal. The only animated moment is the quiz progress bar filling in; hover and click states are simple color and border changes.
- Feedback ("This clicked" / "Still confusing") sits directly under each explanation and quietly adjusts the student's profile over time, so the tool visibly gets to know the student rather than asking them to fill out a settings page.
- No emoji or decorative icons are used anywhere in the interface. Meaning is carried by color, type, and layout alone.

## Accessibility notes

- Text and background combinations meet standard contrast guidelines (light ink text on paper, light text on chalkboard green).
- All interactive elements are implemented as real buttons and inputs, not divs with click handlers, so they remain keyboard and screen-reader accessible.
- No information is conveyed by color alone; every mode also has a text label.
