import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getOrgAuthContext } from "@/lib/org/getOrgAuthContext";

export default async function OrgManageOverviewPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const orgContext = await getOrgAuthContext(orgSlug);

  return (
    <>
      <PageHeader
        description="Configure organization details, access, and billing from one place."
        title={`${orgContext.orgName} Management`}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Org Info</CardTitle>
            <CardDescription>View core organization metadata and identifiers.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className={buttonVariants({ variant: "secondary" })} href={`/${orgSlug}/manage/info`}>
              Open Org Info
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription>Update logo, icon, and organization accent color.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className={buttonVariants({ variant: "secondary" })} href={`/${orgSlug}/manage/branding`}>
              Open Branding
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accounts &amp; Access</CardTitle>
            <CardDescription>Invite users, manage core access levels, and account recovery.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className={buttonVariants({ variant: "secondary" })} href={`/${orgSlug}/manage/access`}>
              Open Accounts &amp; Access
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
            <CardDescription>View subscription details and billing controls.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className={buttonVariants({ variant: "secondary" })} href={`/${orgSlug}/manage/billing`}>
              Open Billing
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
