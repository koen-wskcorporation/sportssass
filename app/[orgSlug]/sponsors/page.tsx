import type { Metadata } from "next";
import { PublicSponsorPage } from "@/modules/sponsors/pages/PublicSponsorPage";
import { getOrgPublicContext } from "@/lib/org/getOrgPublicContext";

export async function generateMetadata({ params }: { params: Promise<{ orgSlug: string }> }): Promise<Metadata> {
  const { orgSlug } = await params;

  return {
    icons: {
      icon: `/${orgSlug}/icon`
    }
  };
}

export default async function SponsorsFormPage({
  params,
  searchParams
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { orgSlug } = await params;
  const orgContext = await getOrgPublicContext(orgSlug);
  const query = await searchParams;

  return <PublicSponsorPage errorCode={query.error} orgContext={orgContext} />;
}
