# Sports SaaS Platform Foundation

This repository is scaffolded as a **multi-tenant platform**, with Sponsorships implemented as the first tool module.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS with shared design tokens
- Supabase (Postgres + Auth + Storage)

## Platform-first architecture

### Tool system

- Registry: `modules/core/tools/registry.ts`
- Permission model: `modules/core/tools/access.ts`
- App shell navigation is rendered from the tool registry (`components/shared/AppShell.tsx`)

Add a new tool by:

1. Creating `modules/{toolName}`
2. Adding a registry entry
3. Adding routes under `/app/org/[orgSlug]/{toolName}`

### Tenancy

- Org resolution: `lib/tenancy/resolveOrg.ts`
- Org role guards: `lib/tenancy/requireOrgRole.ts`
- Shared org-scoped shell layout: `app/app/org/[orgSlug]/layout.tsx`

### Cross-tool event stream

- Global events table: `org_events`
- Event emitter utility: `lib/events/emitOrgEvent.ts`
- Sponsors module emitters: `modules/sponsors/events.ts`

### Sponsorship module

- Module root: `modules/sponsors`
- Includes types, DB queries, components, page components, actions, and event emitters

## Routes

### Public

- `/org/[orgSlug]/sponsor`
- `/org/[orgSlug]/sponsor/success`

### Authenticated platform

- `/app`
- `/app/org/[orgSlug]`
- `/app/org/[orgSlug]/sponsors`
- `/app/org/[orgSlug]/sponsors/[id]`

## Database and RLS

- Migration: `supabase/migrations/202602110001_platform_foundation.sql`
- Includes:
  - `orgs`, `org_memberships`
  - `org_tool_settings`
  - `org_events`
  - `sponsor_submissions`
  - RLS policies for tenant separation
  - Storage bucket/policies for sponsor assets

## Local setup

1. Copy `.env.example` to `.env.local` and fill in keys.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Run Next.js:

   ```bash
   npm run dev
   ```

4. Apply Supabase migration in your Supabase project.
