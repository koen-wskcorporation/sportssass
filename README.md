# Sports SaaS

Early-stage Next.js App Router project for multi-tenant sports organizations.

## Temporary Auth Verification (Production)

1. Deploy.
2. Visit `/api/auth/debug` before login. `hasSbCookies` should be `false`.
3. Login via the `/auth/login` form (server action).
4. Open `/api/auth/debug` after login and verify:
   - `hasSbCookies` is `true`
   - `sbCookieNames` contains `sb-*`
   - `getUserSucceeded` is `true`
   - `supabaseUserId` is non-null
5. If any check fails, use `host` and `x-forwarded-proto` from `/api/auth/debug` (and `/debug/headers` if needed) to diagnose proxy/protocol cookie handling.

## Supabase Auth Redirect Checklist

- In Supabase Dashboard, include exact redirect URLs for every environment:
  - `https://<production-domain>/auth/callback`
  - `http://localhost:3000/auth/callback`
- Ensure Site URL matches your production app origin.
- Keep auth cookies on app domain defaults (no custom cookie domain override in app code).

## Stack

- Next.js + TypeScript
- Tailwind CSS semantic tokens
- Supabase (Auth, Postgres, Storage)

## Canonical Routes

Global routes:

- `/`
- `/auth/login`
- `/auth/logout`
- `/auth/reset`
- `/auth/callback`
- `/account`
- `/forbidden`
- `/api/auth/debug`

Org routes (`orgSlug` is always first segment):

- `/[orgSlug]`
- `/[orgSlug]/[pageSlug]`
- `/[orgSlug]/icon`
- `/[orgSlug]/manage`
- `/[orgSlug]/manage/site`
- `/[orgSlug]/manage/info`
- `/[orgSlug]/manage/branding`
- `/[orgSlug]/manage/access`
- `/[orgSlug]/manage/billing`

## Branding Model

- App default accent: `#00EAFF`
- Org override: accent only (`brand_primary` in DB)
- Org accent is scoped inside org layout only

## Development

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run typecheck
npm run lint
```

## Site Management

- Use `/{orgSlug}/manage/site` to manage pages and navigation.
- Page content is powered by `org_pages` + `org_page_blocks`.
- Navigation is powered by `org_nav_items`.
