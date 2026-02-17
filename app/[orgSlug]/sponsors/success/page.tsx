import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getOrgPublicContext } from "@/lib/org/getOrgPublicContext";

export default async function SponsorsSuccessPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const orgContext = await getOrgPublicContext(orgSlug);

  return (
    <main className="app-container py-8 md:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader description="Your sponsorship interest was submitted successfully." title="Submission Received" />

        <Card>
          <CardHeader>
            <CardTitle>Thanks for your interest in {orgContext.orgName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-text-muted">Our team has your submission and will follow up shortly.</p>
            <div className="flex flex-wrap gap-3">
              <Link className={buttonVariants()} href={`/${orgContext.orgSlug}/forms/sponsorship-intake`}>
                Submit Another Intake
              </Link>
              <Link className={buttonVariants({ variant: "ghost" })} href={`/${orgContext.orgSlug}/sponsors`}>
                View Sponsors Directory
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
