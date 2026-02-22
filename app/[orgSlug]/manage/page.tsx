import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getOrgAuthContext } from "@/lib/org/getOrgAuthContext";
import { can } from "@/lib/permissions/can";

export default async function OrgManageOverviewPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const orgContext = await getOrgAuthContext(orgSlug);
  const canManageOrg = can(orgContext.membershipPermissions, "org.manage.read");
  const canReadBranding = can(orgContext.membershipPermissions, "org.branding.read") || can(orgContext.membershipPermissions, "org.branding.write");

  const cards = [
    {
      title: "Org Info",
      description: "View core organization metadata and identifiers.",
      href: `/${orgSlug}/manage/info`,
      cta: "Open Org Info",
      enabled: canManageOrg
    },
    {
      title: "Branding",
      description: "Update logo, icon, and organization accent color.",
      href: `/${orgSlug}/manage/branding`,
      cta: "Open Branding",
      enabled: canReadBranding
    },
    {
      title: "User Accounts",
      description: "Invite users, manage core access levels, and account recovery.",
      href: `/${orgSlug}/manage/access`,
      cta: "Open Accounts & Access",
      enabled: canManageOrg
    },
    {
      title: "Billing",
      description: "View subscription details and billing controls.",
      href: `/${orgSlug}/manage/billing`,
      cta: "Open Billing",
      enabled: canManageOrg
    }
  ].filter((card) => card.enabled);

  return (
    <>
      <PageHeader
        description="Configure organization details, access, and billing from one place."
        showBorder={false}
        title={`${orgContext.orgName} Manage`}
      />

      {cards.length === 0 ? <Alert variant="info">No organization management modules are available with your current permissions.</Alert> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardTitle>{card.title}</CardTitle>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link className={buttonVariants({ variant: "secondary" })} href={card.href}>
                {card.cta}
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
