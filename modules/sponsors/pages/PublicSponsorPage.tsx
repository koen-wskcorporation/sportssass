import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import type { OrgPublicContext } from "@/lib/org/types";
import type { SponsorProfileListItem } from "@/modules/sponsors/types";

type PublicSponsorPageProps = {
  orgContext: OrgPublicContext;
  sponsors: SponsorProfileListItem[];
};

export function PublicSponsorPage({ orgContext, sponsors }: PublicSponsorPageProps) {
  return (
    <main className="app-container py-8 md:py-10">
      <div className="space-y-6">
        <PageHeader description={`Published sponsor directory for ${orgContext.orgName}.`} title="Sponsors" />

        <Card>
          <CardHeader>
            <CardTitle>Become a Sponsor</CardTitle>
            <CardDescription>Interested in partnering with {orgContext.orgName}? Submit the sponsorship intake form.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className={buttonVariants()} href={`/${orgContext.orgSlug}/forms/sponsorship-intake`}>
              Submit Sponsorship Intake
            </Link>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sponsors.map((sponsor) => (
            <Card key={sponsor.id}>
              <CardHeader>
                <CardTitle className="text-lg">{sponsor.name}</CardTitle>
                <CardDescription>{sponsor.tier || "Sponsor"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {sponsor.logoUrl ? (
                  <div className="flex h-20 items-center justify-center rounded-control border bg-surface-muted p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt={sponsor.name} className="max-h-16 w-full object-contain" src={sponsor.logoUrl} />
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">No logo provided.</p>
                )}
                {sponsor.websiteUrl ? (
                  <a className={buttonVariants({ size: "sm", variant: "secondary" })} href={sponsor.websiteUrl} rel="noreferrer" target="_blank">
                    Visit Website
                  </a>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>

        {sponsors.length === 0 ? <p className="text-sm text-text-muted">No sponsors are published yet.</p> : null}
      </div>
    </main>
  );
}
