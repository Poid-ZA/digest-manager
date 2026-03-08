# APEX Digest Manager

APEX Digest Manager is a feed-first operator console for collecting live technical sources, curating a digest, and publishing the latest run for in-browser review and RSS consumption.

Built and maintained under the APEX / Proxy4u engineering stack.

## What It Does

- ingests live RSS and API-backed technical sources
- stores feeds, articles, runs, and config in Supabase
- triggers live digest runs through Supabase Edge Functions
- publishes the latest curated digest in-browser and as RSS XML
- keeps a local Express fallback for development and recovery

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn-ui
- Supabase
- Vitest

## Local Development

```powershell
cd D:\Workspace\digest-manager
npm install
npm run dev
```

App routes are served by Vite on port `8080`.

## Environment

Copy `.env.example` to `.env` and fill in:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

These values are intentionally not committed.

## Supabase

Migration and function guidance lives in:

- [SUPABASE_SETUP.md](D:\Workspace\digest-manager\SUPABASE_SETUP.md)
- `supabase/migrations/`
- `supabase/functions/`

Use placeholder values in public docs and provide your real project values only through local env files or Supabase secrets.

## Quality Checks

```powershell
npm run lint
npm test
npm run build
```

## Branding

This repository is APEX-owned and Proxy4u-operated.
Any leftover generated-project branding should be treated as accidental and removed.
