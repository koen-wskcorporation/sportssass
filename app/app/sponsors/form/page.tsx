import type { Metadata } from "next";
import { PublicSponsorPage } from "@/modules/sponsors/pages/PublicSponsorPage";
import { getOrgContextFromSearchParams, getOrgSlugFromSearchParams } from "@/lib/tenancy/getOrgContext";

type SponsorFormSearchParams = {
  org?: string | string[];
};

export async function generateMetadata({
  searchParams
}: {
  searchParams: Promise<SponsorFormSearchParams>;
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

export default async function SponsorsFormPage({
  searchParams
}: {
  searchParams: Promise<SponsorFormSearchParams>;
}) {
  const query = await searchParams;
  const orgContext = await getOrgContextFromSearchParams(query, "public");

  return <PublicSponsorPage orgContext={orgContext} />;
}
