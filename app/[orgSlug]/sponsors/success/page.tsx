import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getOrgPublicContext } from "@/lib/org/getOrgPublicContext";

export async function generateMetadata({ params }: { params: Promise<{ orgSlug: string }> }): Promise<Metadata> {
  const { orgSlug } = await params;

  return {
    icons: {
      icon: `/${orgSlug}/icon`
    }
  };
}

export default async function SponsorsSuccessPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const orgContext = await getOrgPublicContext(orgSlug);

  return (
    <main className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <div className="space-y-6">
        <PageHeader description="Your sponsorship interest was submitted successfully." title="Submission Received" />
        <Card>
          <CardHeader>
            <CardTitle>Thanks for your interest in {orgContext.orgName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Our team has your submission and will follow up with next steps shortly.
            </p>
            <div className="flex gap-3">
              <Link className={buttonVariants()} href={`/${orgContext.orgSlug}/sponsors`}>
                Submit Another
              </Link>
              <Link className={buttonVariants({ variant: "ghost" })} href={`/${orgContext.orgSlug}`}>
                Visit Org Page
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
