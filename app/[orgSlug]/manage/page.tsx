import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requireOrgPermission } from "@/lib/permissions/requireOrgPermission";

export default async function OrgSettingsOverviewPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const orgContext = await requireOrgPermission(orgSlug, "org.branding.write");

  return (
    <div className="space-y-6">
      <PageHeader
        description="Organization configuration, branding, access, and billing."
        title={`Manage ${orgContext.orgName}`}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription>Logo, icon, colors, theme.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className={buttonVariants({ variant: "secondary" })} href={`/${orgSlug}/manage/branding`}>
              Open
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>Invite users, roles, access.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className={buttonVariants({ variant: "secondary" })} href={`/${orgSlug}/manage/members`}>
              Open
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
            <CardDescription>Plan, invoices, payment method.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className={buttonVariants({ variant: "secondary" })} href={`/${orgSlug}/manage/billing`}>
              Open
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
