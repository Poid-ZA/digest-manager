# Supabase Cutover

## 1. Run the SQL migration

Run the contents of:

- `supabase/migrations/20260308_digest_manager.sql`
- `supabase/import-chunks/00_reset_digest_data.sql`
- `supabase/import-chunks/01_import_feeds.sql`
- `supabase/import-chunks/02_import_articles_01.sql` through `02_import_articles_16.sql`
- `supabase/import-chunks/03_import_runs.sql`
- `supabase/import-chunks/04_import_config.sql`
- `supabase/import-chunks/05_import_test_emails.sql`

This creates:

- `digest_feeds`
- `digest_articles`
- `digest_runs`
- `digest_config`
- `digest_test_emails`

It also seeds the default feed list and singleton config row.
The chunked files import the current local digest state snapshot into those tables without hitting the Supabase SQL editor size limit.

## 2. Configure the frontend

Create `.env` from `.env.example` and set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

When those are present, the React app uses Supabase directly for feed/config/article/run state.

## 3. Deploy Supabase Edge Functions

Functions included in this repo:

- `trigger-digest-run`
- `send-test-email`
- `reset-digest-state`

Required function secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional email secret:

- `RESEND_API_KEY`
- `DIGEST_FROM_EMAIL`

`send-test-email` uses preview-only mode unless `RESEND_API_KEY` is configured.

Use the CLI through `npx` if `supabase` is not installed globally:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
npx supabase secrets set DIGEST_FROM_EMAIL=your-from-address@example.com
npx supabase secrets set RESEND_API_KEY=YOUR_RESEND_KEY
npx supabase functions deploy trigger-digest-run
npx supabase functions deploy send-test-email
npx supabase functions deploy reset-digest-state
```

## 4. Local backend status

The local Express server remains in the repo as a fallback path, but once Supabase env vars and Edge Functions are deployed, the frontend no longer needs the local JSON-backed API.
