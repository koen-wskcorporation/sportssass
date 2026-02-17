import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getOrgAuthContext } from "@/lib/org/getOrgAuthContext";
import { can } from "@/lib/permissions/can";

export default async function OrgToolsOverviewPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const orgContext = await getOrgAuthContext(orgSlug);

  const canViewForms = can(orgContext.membershipPermissions, "forms.read");
  const canViewSponsors = can(orgContext.membershipPermissions, "sponsors.read");
  const canViewAnnouncements = can(orgContext.membershipPermissions, "announcements.read");
  const hasVisibleTools = canViewForms || canViewSponsors || canViewAnnouncements;

  return (
    <>
      <PageHeader description="Run day-to-day workflows for your organization." title="Tools" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {canViewForms ? (
          <Card>
            <CardHeader>
              <CardTitle>Forms</CardTitle>
              <CardDescription>Build, publish, and review submissions for public and embedded forms.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link className={buttonVariants({ variant: "secondary" })} href={`/${orgSlug}/tools/forms`}>
                Open Forms
              </Link>
            </CardContent>
          </Card>
        ) : null}

        {canViewSponsors ? (
          <Card>
            <CardHeader>
              <CardTitle>Sponsors</CardTitle>
              <CardDescription>Review submissions and run sponsorship pipeline workflows.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link className={buttonVariants({ variant: "secondary" })} href={`/${orgSlug}/tools/sponsors`}>
                Open Sponsors
              </Link>
            </CardContent>
          </Card>
        ) : null}

        {canViewAnnouncements ? (
          <Card>
            <CardHeader>
              <CardTitle>Announcements</CardTitle>
              <CardDescription>Create and publish announcement updates for organization pages.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link className={buttonVariants({ variant: "secondary" })} href={`/${orgSlug}/tools/announcements`}>
                Open Announcements
              </Link>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {!hasVisibleTools ? <p className="text-sm text-text-muted">No tools are available for your current role.</p> : null}
    </>
  );
}
