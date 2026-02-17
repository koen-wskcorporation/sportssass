import { getOrgPublicContext } from "@/lib/org/getOrgPublicContext";
import { PublicSponsorPage } from "@/modules/sponsors/pages/PublicSponsorPage";
import { listPublishedSponsorProfiles } from "@/modules/sponsors/db/queries";

export default async function SponsorsDirectoryPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const orgContext = await getOrgPublicContext(orgSlug);
  const sponsors = await listPublishedSponsorProfiles(orgContext.orgId);

  return <PublicSponsorPage orgContext={orgContext} sponsors={sponsors} />;
}
