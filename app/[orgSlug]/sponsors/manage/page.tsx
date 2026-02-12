import type { Metadata } from "next";
import { SponsorsListPage } from "@/modules/sponsors/pages/SponsorsListPage";
import { getOrgAuthContext } from "@/lib/org/getOrgAuthContext";

type SponsorsManageSearchParams = {
  updated?: string;
};

export async function generateMetadata({ params }: { params: Promise<{ orgSlug: string }> }): Promise<Metadata> {
  const { orgSlug } = await params;

  return {
    icons: {
      icon: `/${orgSlug}/icon`
    }
  };
}

export default async function SponsorsManagePage({
  params,
  searchParams
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<SponsorsManageSearchParams>;
}) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const orgContext = await getOrgAuthContext(orgSlug);

  return <SponsorsListPage orgContext={orgContext} updated={query.updated === "1"} />;
}
