import { SponsorsListPage } from "@/modules/sponsors/pages/SponsorsListPage";
import { resolveOrg } from "@/lib/tenancy/resolveOrg";

export default async function SponsorsRoutePage({
  params,
  searchParams
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ updated?: string }>;
}) {
  const { orgSlug } = await params;
  const orgContext = await resolveOrg(orgSlug);
  const query = await searchParams;

  return <SponsorsListPage orgContext={orgContext} updated={query.updated === "1"} />;
}
