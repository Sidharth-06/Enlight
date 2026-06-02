# Interview Prep Bot

An AI-assisted interview prep app that lets users configure mock interviews, practice coding or behavioral questions, and get feedback, hints, and session history.

## Features
1. Multiple interview types: coding, system design, behavioral, situational, and HR
2. Customizable session setup (role, difficulty, persona, question count, timed mode)
3. In-browser coding editor with AI review hints
4. Answer evaluation with scores and feedback
5. Session history and starred questions

## Tech Stack
- Next.js 15 + React 19
- Supabase (auth + API integration)
- Zustand for session state
- Monaco Editor

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env.local` file (see `.env.example`):
   ```bash
   cp .env.example .env.local
   ```
3. Run the dev server:
   ```bash
   npm run dev
   ```

## Scripts
- `npm run dev` — Start dev server
- `npm run build` — Build for production
- `npm run start` — Start production server
- `npm run lint` — Lint the codebase

## Deployment Notes
Set the environment variables from `.env.example` in your hosting provider (Supabase URL and anon key are required).
