import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { listUserOrgs } from "@/lib/tenancy/listUserOrgs";
import { requireAuth } from "@/lib/auth/requireAuth";

export default async function AppLandingPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAuth();

  const memberships = await listUserOrgs();
  const resolvedSearchParams = await searchParams;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-10">
      <div className="space-y-6">
        <PageHeader
          description="Select an organization workspace to access platform tools."
          title="Organization Workspaces"
        />

        {resolvedSearchParams.error === "org_access_denied" ? (
          <Alert variant="warning">You do not have access to that organization.</Alert>
        ) : null}
        {resolvedSearchParams.error === "org_required" ? (
          <Alert variant="warning">Choose an organization workspace before opening tool pages.</Alert>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {memberships.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No organizations yet</CardTitle>
                <CardDescription>
                  Sign in with a user that belongs to an organization and create at least one membership.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link className={buttonVariants({ variant: "secondary" })} href="/app/sponsors/form?org=demo">
                  Open Public Sponsor Form
                </Link>
              </CardContent>
            </Card>
          ) : (
            memberships.map((membership) => (
              <Card key={membership.orgId}>
                <CardHeader>
                  <CardTitle>{membership.orgName}</CardTitle>
                  <CardDescription>
                    Role: <span className="font-semibold uppercase">{membership.role}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link className={buttonVariants()} href={`/app/sponsors/manage?org=${encodeURIComponent(membership.orgSlug)}`}>
                    Open Workspace
                  </Link>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
