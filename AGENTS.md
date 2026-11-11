# The Legacy Lab app: rules for every AI agent

This file is for **any** AI working in this repo: Claude Code (Vivis) or Emergent (Dario). Follow it for the whole task.

## Read first
1. This file.
2. The 3 newest entries at the top of `HANDOFF.md`.
3. `memory/PRD.md` (product spec, in Italian).

## What this is
Platform where Italian businesses submit short video candidatures (max 60 s) and the community votes; tour of selected companies filmed for a TV format; university hub; founder vision. Client: Dario (ProjectZero). Live at **app.thelegacyofficiallab.com**. The marketing site is a separate repo (`the-legacy-website`).

## Stack
- App: Expo Router (React Native + web), yarn 1. Tabs: Home, Tour, Candidati, Classifica, Profilo.
- Backend: FastAPI + MongoDB Atlas, hosted on Render. Web build hosted on Vercel. Email: Resend.
- Video recording only works on a real phone (Expo Go), not in the web preview.

## Branches
- **Start branch:** `dante/improvements` (it is ahead of `main`; becomes `main` once Vivis merges it).
- Work on a task branch: Emergent → `dario/<task>`, Claude → `vivis/<task>`.
- **Never commit or save to `main`.** Only Vivis merges into `main` and deploys to production.

## Languages and tone
Italian first.

## Design
- Brand: dark navy `#0F1A2A` + orange `#F57C00`.
- Fonts: Cormorant Garamond (titles) + Satoshi (text).

## Don't touch without asking Vivis
- `.env*` files, `vercel.json`, `.gitignore`, `.emergent/`, deploy and hosting settings, auth/security code.
- No passwords, API keys or secrets in any file, commit or chat message. Real values live on Vercel/Render.

## End of every task
Add an entry at the TOP of `HANDOFF.md` (format is in that file).
