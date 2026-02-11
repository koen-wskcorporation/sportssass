import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getOrgContext } from "@/lib/tenancy/getOrgContext";

export default async function OrgPublicHomePage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const orgContext = await getOrgContext(orgSlug, "public");

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="space-y-6">
        <PageHeader
          description="Public organization homepage with access into tool workflows."
          title={orgContext.orgName}
        />

        <Card>
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>Use the sponsorship form or sign in to manage submissions.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link className={buttonVariants()} href={`/app/sponsors/form?org=${encodeURIComponent(orgContext.orgSlug)}`}>
              Sponsorship Form
            </Link>
            <Link className={buttonVariants({ variant: "secondary" })} href="/auth/login">
              Staff Sign In
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
