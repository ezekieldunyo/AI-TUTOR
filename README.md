# Adaptive tutor

An AI tutor that figures out how you learn, then explains everything that way.

Built for GatewayHacks 2026, Equity in Education track.

## The problem

Most tutoring tools give every student the same explanation regardless of how that student actually processes information. A student who thinks in diagrams and a student who thinks in ordered steps get the same paragraph of text. That mismatch makes learning harder than it needs to be, especially for students who are not well served by dense written explanations.

## What this does

1. A short, interactive quiz identifies whether a student tends to think in pictures, stories, examples, or ordered steps.
2. The student types in a topic, or uploads a PDF such as a textbook page or homework sheet.
3. The material is automatically broken into a sequence of small cards, as few or as many as the content calls for. Every card holds the same four elements: a visual map, a big idea, key pieces, and a real-world analogy, but the student's learning style decides which element leads and how the card looks, not just its wording.
4. The student steps through the cards, can manually switch styles at any point to compare, and can rate a card as helpful or unhelpful, which adjusts their profile over time.

## Why it matters

Judged against the track's goal of tools that personalize learning: this project treats learning style as a first-class input to the explanation itself, not an afterthought or a settings toggle. Design and clarity were treated as part of the solution, not decoration on top of it. See `DESIGN.md` for the full design rationale.

## Tech stack

- React (Vite) frontend
- PHP backend (`api/tutor.php`) that calls the Gemini API with the key kept server-side
- Google Gemini (free tier) for real card generation
- pdfjs-dist for client-side PDF text extraction
- Inline SVG for the learning-style radar chart
- If the backend is unreachable, the frontend falls back to a local text-chunking heuristic so a demo never breaks on stage

## Running it locally

1. Install dependencies:
```bash
npm install
```

2. Set up the backend:
```bash
cd api
cp config.example.php config.php
```

Open `api/config.php` and paste in a free Gemini API key from https://ai.google.dev.

3. Start the PHP backend server:
```bash
cd api
php -S localhost:8000
```

4. In a new terminal, start the frontend development server:
```bash
npm run dev
```

The Vite proxy in `vite.config.js` automatically forwards `/api` requests to `http://localhost:8000`, so the frontend and backend will communicate seamlessly.

Open the local URL it prints, usually `http://localhost:5173`.

## Project structure

```
adaptive-tutor/
  src/
    App.jsx               the full frontend application
    main.jsx              React entry point
  api/
    tutor.php             backend endpoint calling Gemini
    config.example.php    template for your API key
    config.php            your real key, not committed
    .htaccess             Apache configuration for production
  index.html               fonts loaded here
  package.json             dependencies and scripts
  vite.config.js           Vite configuration with proxy
  DESIGN.md                design rationale and visual system
  REQUIREMENTS.md          functional and non-functional requirements
  DEPLOYMENT.md            deployment guide for production
  README.md                this file
```

## Project structure

```
adaptive-tutor/
  src/
    App.jsx               the full frontend application
  api/
    tutor.php             backend endpoint calling Gemini
    config.example.php    template for your API key
    config.php            your real key, not committed
  index.html               fonts loaded here
  DESIGN.md                design rationale and visual system
  REQUIREMENTS.md          functional and non-functional requirements
  README.md                this file
```

## Next steps

- Tighten the CORS header in `api/tutor.php` to your actual deployed domain instead of `*` before sharing a public link.
- Support additional upload formats, such as photographed textbook pages.
- Persist a student's profile across sessions.
- Add a teacher-facing view summarizing learning styles across a class.

## Track

Equity in Education, GatewayHacks 2026.
