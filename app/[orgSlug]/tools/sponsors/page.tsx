import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireOrgPermission } from "@/lib/permissions/requireOrgPermission";

export default async function SponsorsToolsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const orgContext = await requireOrgPermission(orgSlug, "sponsors.read");

  return (
    <div className="space-y-6">
      <PageHeader description="Manage sponsorship workflows from one place." title="Sponsors" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Submission Queue</CardTitle>
            <CardDescription>Review sponsor profiles from form intake submissions.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className={buttonVariants({ variant: "secondary" })} href={`/${orgContext.orgSlug}/tools/sponsors/manage`}>
              Open Submission Queue
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Public Sponsor Directory</CardTitle>
            <CardDescription>Open the public sponsor listing and sponsorship intake entrypoint.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className={buttonVariants({ variant: "secondary" })} href={`/${orgContext.orgSlug}/sponsors`}>
              View Public Directory
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
