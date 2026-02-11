import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getOrgContextFromSearchParams, getOrgSlugFromSearchParams } from "@/lib/tenancy/getOrgContext";

type SponsorSuccessSearchParams = {
  org?: string | string[];
};

export async function generateMetadata({
  searchParams
}: {
  searchParams: Promise<SponsorSuccessSearchParams>;
}): Promise<Metadata> {
  const query = await searchParams;
  const orgSlug = getOrgSlugFromSearchParams(query);

  if (!orgSlug) {
    return {};
  }

  return {
    icons: {
      icon: `/org/${orgSlug}/icon`
    }
  };
}

export default async function SponsorsFormSuccessPage({
  searchParams
}: {
  searchParams: Promise<SponsorSuccessSearchParams>;
}) {
  const query = await searchParams;
  const orgContext = await getOrgContextFromSearchParams(query, "public");

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
              <Link className={buttonVariants()} href={`/app/sponsors/form?org=${encodeURIComponent(orgContext.orgSlug)}`}>
                Submit Another
              </Link>
              <Link className={buttonVariants({ variant: "ghost" })} href={`/org/${orgContext.orgSlug}`}>
                Visit Org Page
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
