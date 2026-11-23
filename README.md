# Sabarish Fast Food

Mobile-first sales and expense management system built with Next.js 16, React 19, Supabase, Tailwind CSS, Recharts and PDF-lib.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Configure the Supabase URL and publishable key.
4. Configure `SUPABASE_SECRET_KEY` only on a trusted server environment.
5. Configure `APP_URL` as the public application origin.
6. Apply `supabase/migrations/20261123061817_tracker.sql` through the Supabase project or CLI.
7. Start with `npm run dev`.

Never commit `.env.local` or any service-role/secret key.

## Checks

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run test:e2e`
