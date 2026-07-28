# TeamPulse

A shared schedule dashboard for the Visual Optics Lab — see where everyone is during the week,
and update your own status in under 10 seconds. Single-team, no admin role: everyone can see
the whole team's schedule, but can only edit their own.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase (Postgres, Auth, Realtime) · Vercel.

## Local setup

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Create a Supabase project at [supabase.com](https://supabase.com), then in its SQL Editor run each file in
   [`supabase/migrations`](supabase/migrations) in order (`0001` → `0005`).
3. Copy `.env.local.example` to `.env.local` and fill in the two values from
   Supabase → Settings → API (Project URL and anon/public key).
4. In Supabase → Authentication → Providers, enable **Google** (needs a Google Cloud OAuth
   client — set its authorized redirect URI to `<your-supabase-project-url>/auth/v1/callback`)
   and make sure **Email** is enabled (one-time code, no password). For production email
   volume, configure custom SMTP (Project Settings → Authentication → SMTP Settings) — the
   default Supabase mailer is rate-limited to a handful of emails and meant only for testing.
5. Run the app:
   ```bash
   pnpm dev
   ```

## How it works

- There is exactly one team (seeded by migration `0005`). Every new signup joins it automatically
  — there's no onboarding step, invite codes, or admin role.
- Every day defaults to **Office**. `schedule_entries` only stores days that differ from that —
  there's nothing to clean up if someone forgets to "set" Office.
- Authorization is enforced by Postgres Row Level Security, not just the app layer — everyone can
  read the whole team's schedule, but can only write their own row. See
  `supabase/migrations/20260728000003_rls_policies.sql` and `...000005_single_team_no_admin.sql`.

## Deploying

Push to a Git repo, import it in Vercel, and set the two `NEXT_PUBLIC_SUPABASE_*` env vars there
as well (Project Settings → Environment Variables). Add the deployed URL as an additional
redirect URL in Supabase → Authentication → URL Configuration.
