# Anowar Creation — Online Exam System

A complete multi-page starter project for a WBCHSE Class 11 Biology (NEET-based) online mock test.

## Included pages
- `exam/index.html` — student entry (name, roll number, exam code)
- `exam/instructions.html` — instructions and exam rules
- `exam/test.html` — timed MCQ exam interface
- `exam/result.html` — score, correct/wrong/unanswered, answer review, chapter-wise performance
- `exam/certificate.html` — printable certificate / Save as PDF
- `exam-admin/index.html` — separate admin sign-in screen
- `exam-admin/dashboard.html` — exam administration and analytics starter
- `assets/exam/` — stylesheet, JavaScript, and Anowar Creation SVG logo
- `supabase/schema.sql` — database tables and Row Level Security starter
- `supabase/functions/README.md` — secure backend implementation checklist

## Important before publishing
This ZIP is a **functional front-end prototype**, not a production-secure live examination service yet.
- Student flow and sample test work in the browser. Results are stored in that browser's local storage for demonstration.
- The default demo exam code is `BIO11-2026`.
- The demo uses a sample question bank. Replace/edit it before official use.
- The admin page is intentionally not given a fake hard-coded password. Real admin sign-in must be connected to Supabase Auth.
- Do not publish secret keys in browser JavaScript. Never expose the Supabase `service_role` key.
- For a real secure exam, the server must validate exam codes, fetch questions, store attempts, calculate results, and issue/verify certificates. A browser-only timer and local storage can be manipulated.
- Configure Supabase project URL and anon key only after implementing the policies and Edge Functions. The anon key is designed for browser use only with correct RLS.

## How to preview locally
Open `exam/index.html` in a modern browser. If browser restrictions affect navigation/local storage, run a local static server or use GitHub Pages.

## Deploy to GitHub Pages
Upload the contents to the `online-exam-system` branch. If this branch is published as a separate GitHub Pages site, set the source to that branch. If publishing from the existing website's repository, place the files under the chosen folder and use the corresponding path. This package does not change your current website automatically.

## Exam rules in this starter
- 30 questions, 30 minutes
- Correct: +4
- Incorrect: -1
- Unanswered: 0
- Maximum: 120
- Pass percentage: currently 40% in demo; intended to be admin-configurable in the live backend
- Topics: Body Fluids and Circulation; Breathing and Respiration; Excretory Products and their Elimination; Locomotion and Movement; Structural Organisation in Animals; Biological Classification; Cell: The Unit of Life; Cell Cycle and Cell Division; The Living World; Plant Kingdom; Morphology of Flowering Plants.

## Branding
`assets/exam/anowar-creation-logo.svg` is a newly created vector wordmark for this package, since no original logo file was attached to the project context. Replace it with your official logo file if you have one.
