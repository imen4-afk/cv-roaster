# 🔥 CV Roaster

Get your CV roasted by AI (score, blunt feedback, ATS mismatch analysis, missing keywords), or build a CV from scratch by chatting with an AI career coach.

**Stack:** Vite + React + Tailwind CSS v4 · Supabase (auth + database) · Gemini API (`gemini-flash-latest`) over REST. There is no separate backend.

## Features

- **Auth:** email + password sign up / sign in with Supabase, with no confirmation email: you're logged in as soon as you sign up. Every page except `/login` is protected.
- **`/dashboard`:** two entry points plus your history of roasts and generated CVs.
- **`/improve`:** paste or upload a `.txt` CV, optionally add a target job description, and get:
  - an animated score gauge (red < 50, orange 50-74, green 75+)
  - a one-line verdict, roast points and strengths
  - a before/after rewrite of your weakest bullet
  - a "Why this won't match" section with expandable cards
  - missing keywords shown as chips

  The **Try an example** button loads one of two sample CVs (one weak, one decent).
- **`/generate`:** a chat with an AI career coach that answers in English, French or Arabic and shows a progress bar of the topics covered. When it has enough information, it writes a one-page CV that you can **Download as PDF** (using the browser's print dialog) or **Roast**.
- Every result is saved to Supabase and can be reopened from the dashboard.
- If a Gemini call fails or returns invalid JSON, the app retries once automatically and then shows a friendly error message.

## Setup

### 1. Install

```bash
npm install
```

Requires Node 20.19+ (or 22.12+).

### 2. Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. This creates the `cv_analyses` and `generated_cvs` tables with row-level security, so each user only sees their own data.
3. Go to **Project Settings → API** and copy the **Project URL** and the **anon public** key.
4. **Required:** go to **Authentication → Sign In / Providers → Email**, turn off **Confirm email**, and save. The app signs users in with just their email and password, without a confirmation email. If this setting stays on, sign-up shows a message asking you to turn it off.

### 3. Gemini

Create an API key at [Google AI Studio](https://aistudio.google.com/apikey).

### 4. Environment

```bash
cp .env.example .env
```

Then fill in the three values:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_GEMINI_API_KEY=AIza...
```

> ⚠️ Every `VITE_*` variable is bundled into the client, so the Gemini key is visible to anyone using the app. That's fine for a demo or a hackathon. For production, move the Gemini calls behind a server (for example a Supabase Edge Function) and restrict the key in Google Cloud.

### 5. Run

```bash
npm run dev
```

Open http://localhost:5173, create an account, and start roasting.

```bash
npm run build     # production build in dist/
npm run preview   # serve the production build
```

## Project structure

```
src/
  lib/
    gemini.js       askGeminiJSON(prompt) + chatGemini(history, systemPrompt), retry & friendly errors
    supabase.js     Supabase client
    prompts.js      roast / coach / CV-generation prompts + JSON validators
    topics.js       topic detection for the chat progress bar (EN/FR/AR)
    cvText.js       CV JSON -> plain text (for "Roast this CV")
    samples.js      the two "Try an example" CVs
  context/AuthContext.jsx
  components/       Navbar, ProtectedRoute, ScoreGauge, AnalysisResult, CvTemplate, CvActions, Spinner, ErrorBox
  pages/            Login, Dashboard, Improve, Generate, AnalysisView, CvView
supabase/schema.sql
```

## Deploying to Vercel

1. Import the GitHub repo in Vercel. It detects Vite automatically (build command `npm run build`, output directory `dist`).
2. In **Project Settings → Environment Variables**, add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_GEMINI_API_KEY`, then **redeploy**. Vite bakes these values in at build time, so a redeploy is required after any change.
`vercel.json` rewrites every route to `index.html`, so refreshing on `/dashboard` or opening `/cv/123` directly works. If an environment variable is missing, the app shows an on-screen message naming it instead of a blank page.
