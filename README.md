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
   [`supabase/migrations`](supabase/migrations) in order (`0001` → `0007`).
3. Copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase → Settings → API.
   - `SUPABASE_SERVICE_ROLE_KEY` — same page, further down (keep this one secret).
   - `TEAM_INVITE_PASSCODE` — whatever shared passcode you want people to use to join.
4. Run the app:
   ```bash
   pnpm dev
   ```

## How it works

- **Sign-in is name + a shared passcode — no email verification at all.** Supabase's account
  system still requires an email value internally, so one is derived deterministically from the
  name (`<slug>@visualoptics.local`) and never actually used to send anything; the account is
  created via the Admin API and a session is minted directly server-side (see
  `signInWithNameAndPasscode` in `src/lib/actions/auth.ts`). The name is the only per-person
  identifier and there's no secret beyond the shared passcode — a deliberate simplicity
  trade-off, not an oversight.
- There is exactly one team (seeded by migration `0005`). Every sign-in joins it automatically —
  no onboarding step, invite codes, or admin role.
- Every day defaults to **Office**, split into independent morning/afternoon halves.
  `schedule_entries` only stores halves that differ from that — nothing to clean up if someone
  forgets to "set" Office.
- Authorization is enforced by Postgres Row Level Security, not just the app layer — everyone can
  read the whole team's schedule, but can only write their own row. See
  `supabase/migrations/20260728000003_rls_policies.sql` and `...000005_single_team_no_admin.sql`.

## Deploying

Push to a Git repo, import it in Vercel, and set all four env vars there too (Project Settings →
Environment Variables) — including `SUPABASE_SERVICE_ROLE_KEY`, since sign-in depends on it.
