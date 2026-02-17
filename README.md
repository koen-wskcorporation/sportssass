# Sports SaaS

Early-stage Next.js App Router project for multi-tenant sports organizations.

## Temporary Auth Verification (Production)

1. Deploy.
2. Visit `/debug/headers` before login. `cookieHeaderPresent` should be `false`.
3. Login via the `/auth/login` form.
4. In DevTools Network, inspect `POST /auth/login` and confirm `set-cookie` exists on the response.
5. Open `/debug/headers` and `/debug/auth` after login.
6. Verify:
   - `cookieHeaderPresent` is `true`
   - `serverCookieNames` includes `sb-*` cookies
   - `supabaseUserId` is non-null
7. If any check fails, use `host` and `x-forwarded-proto` from both debug endpoints to diagnose proxy/protocol cookie handling.

## Stack

- Next.js + TypeScript
- Tailwind CSS semantic tokens
- Supabase (Auth, Postgres, Storage)

## Canonical Routes

Global routes:

- `/`
- `/auth/login`
- `/auth/logout`
- `/account`
- `/forbidden`

Org routes (`orgSlug` is always first segment):

- `/[orgSlug]`
- `/[orgSlug]/icon`
- `/[orgSlug]/forms/[slug]`
- `/[orgSlug]/forms/[slug]/submit`
- `/[orgSlug]/sponsors`
- `/[orgSlug]/sponsors/success`
- `/[orgSlug]/manage`
- `/[orgSlug]/manage/org-info`
- `/[orgSlug]/manage/branding`
- `/[orgSlug]/manage/members`
- `/[orgSlug]/manage/billing`
- `/[orgSlug]/tools`
- `/[orgSlug]/tools/forms`
- `/[orgSlug]/tools/forms/[id]/edit`
- `/[orgSlug]/tools/forms/[id]/submissions`
- `/[orgSlug]/tools/forms/[id]/submissions/export`
- `/[orgSlug]/tools/sponsors`
- `/[orgSlug]/tools/sponsors/manage`
- `/[orgSlug]/tools/sponsors/manage/[id]`
- `/[orgSlug]/tools/announcements`

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

## Forms Workflow

1. Open `/{orgSlug}/tools/forms`.
2. Create a form and open the builder.
3. Build fields in the left palette + center canvas + right inspector.
4. Save draft and publish. Each publish creates a new immutable `form_versions` snapshot.
5. Public runtime route is `/{orgSlug}/forms/{slug}`.

## Embed Forms In Site Builder

- Add the `embed_form` block in page builder.
- Choose a published form.
- Pick `inline` or `modal` render variant.
- Optionally override title and success message per embed instance.

## Submission Inbox + CSV Export

- View inbox at `/{orgSlug}/tools/forms/{id}/submissions`.
- Filter by status (`all`, `submitted`, `reviewed`, `archived`).
- Open individual submissions to inspect answers against the snapshot version used at submit time.
- Export filtered rows at `/{orgSlug}/tools/forms/{id}/submissions/export`.

## Sponsorship Intake + Directory

- Canonical intake URL: `/{orgSlug}/forms/sponsorship-intake`.
- Public `/{orgSlug}/sponsors` now renders the published sponsor directory.
- Intake submissions with sponsorship behavior create `sponsor_profiles` in `pending`.
- Sponsors admins (`sponsors.write`) review profiles at:
  - `/{orgSlug}/tools/sponsors/manage`
  - `/{orgSlug}/tools/sponsors/manage/{id}`
- Publish a profile by setting status to `published`.
