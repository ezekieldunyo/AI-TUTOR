# Requirements

## Problem statement

Most AI tutoring tools return the same explanation to every student regardless of how that student actually processes information. A student who thinks in pictures and a student who thinks in sequential steps get the identical block of text. This mismatch is a documented barrier in education, particularly for students who are not well served by a purely text-heavy explanation style.

## Goal

Build a working prototype that diagnoses a student's learning style through a short interactive quiz, then generates explanations of any topic reshaped to fit that style, and lets the student correct the diagnosis over time through feedback.

## Track alignment

Equity in Education. The project connects directly to the track's call for tools that personalize learning.

## User stories

- As a student, I want to complete a short quiz so the tool understands how I learn.
- As a student, I want to type any topic and receive an explanation suited to my learning style, so I understand it faster than from a generic explanation.
- As a student, I want to compare the same topic across different explanation styles, so I can find what actually works for me.
- As a student, I want to give quick feedback on whether an explanation helped, so the tool adjusts to me over time.
- As a judge, I want to see the interface visibly change shape between learning styles, so the personalization is obvious without reading documentation.

## Functional requirements

1. The application presents a landing screen introducing the product.
2. The application presents a five-question quiz. Each answer maps to one of four learning styles: visual, verbal, example-driven, step-by-step.
3. After the quiz, the application computes a learning-style profile as a percentage breakdown across the four styles and displays it as a radar chart.
4. The student can enter any topic in a text field, or upload a PDF (such as a textbook page or homework sheet), as the source material to be explained.
5. Source material, whether typed or extracted from a PDF, is automatically broken into a variable number of concept-sized cards (as few as one, as many as the material calls for).
6. Every card contains the same four underlying elements: a visual map, a big idea, key pieces, and a real-world analogy. The student's learning style determines which element leads and how the card is laid out, not which elements are present.
7. The student can step forward and backward through the card sequence.
8. The student can manually override the active style from the sidebar to view the same material in a different mode.
9. The student can mark a card as helpful or unhelpful; this feedback adjusts the underlying profile.
10. The application keeps a short history of recently explained topics and uploaded files, visible in the sidebar.
11. If an uploaded file is not a valid or readable PDF, the application shows a clear inline error and does not proceed.

## Non-functional requirements

- The interface must remain usable and legible at common desktop and laptop widths.
- No emoji or decorative icon fonts are used anywhere in the product.
- All interactive elements must be reachable and operable by keyboard.
- The application must run entirely client-side for the hackathon demo, with no required backend, so judges can run it locally without extra setup.

## Out of scope for this submission

- User accounts, login, or persistence of a profile across devices.
- A production-grade backend or database.
- Multi-language support.
- Real classroom deployment or integration with a learning management system.

## Backend

A PHP endpoint (`api/tutor.php`) receives chunked text and a learning style, calls the Gemini API with the API key held server-side, and returns structured card content (big idea, key pieces, analogy) as JSON. The key is never exposed to the browser. If the backend is unreachable, the frontend falls back to a local text-chunking heuristic so the demo still functions.

## Stretch goals (post-hackathon)

- Support additional upload formats beyond PDF, such as photographed textbook pages.
- Persist a student's profile across sessions.
- Allow a teacher view that shows aggregate learning-style distribution across a class.
