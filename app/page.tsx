import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { listUserOrgs } from "@/lib/org/listUserOrgs";
import { getSessionUser } from "@/lib/auth/getSessionUser";

export default async function HomePage() {
  const user = await getSessionUser();
  const memberships = user ? await listUserOrgs() : [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-10">
      <div className="space-y-6">
        <PageHeader
          description="Choose an organization workspace or open its public mini-site."
          title="Organization Workspaces"
        />

        {!user ? (
          <Card>
            <CardHeader>
              <CardTitle>Welcome</CardTitle>
              <CardDescription>Sign in to access organization management areas tied to your account.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Link className={buttonVariants()} href="/auth/login">
                Sign in
              </Link>
            </CardContent>
          </Card>
        ) : memberships.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No organizations yet</CardTitle>
              <CardDescription>Your account is signed in but does not have any organization memberships yet.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {memberships.map((membership) => (
              <Card key={membership.orgId}>
                <CardHeader>
                  <CardTitle>{membership.orgName}</CardTitle>
                  <CardDescription>
                    Role: <span className="font-semibold uppercase">{membership.role}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Link className={buttonVariants()} href={`/${membership.orgSlug}/sponsors/manage`}>
                    Open Manage
                  </Link>
                  <Link className={buttonVariants({ variant: "secondary" })} href={`/${membership.orgSlug}`}>
                    View Public Site
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
