import { getOrgAuthContext } from "@/lib/org/getOrgAuthContext";
import { SponsorsListPage } from "@/modules/sponsors/pages/SponsorsListPage";

type SponsorsManageSearchParams = {
  updated?: string;
};

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
