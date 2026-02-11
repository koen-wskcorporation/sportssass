import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export default async function OrgSettingsOverviewPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings Overview</CardTitle>
        <CardDescription>Choose a section to manage organization-level configuration.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Link className={buttonVariants({ variant: "secondary" })} href={`/org/${orgSlug}/settings/branding`}>
          Branding
        </Link>
        <Link className={buttonVariants({ variant: "secondary" })} href={`/org/${orgSlug}/settings/members`}>
          Members
        </Link>
        <Link className={buttonVariants({ variant: "secondary" })} href={`/org/${orgSlug}/settings/billing`}>
          Billing
        </Link>
      </CardContent>
    </Card>
  );
}
