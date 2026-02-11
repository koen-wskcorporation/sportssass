import { SponsorsListPage } from "@/modules/sponsors/pages/SponsorsListPage";
import { requireOrgPermission } from "@/lib/auth/requireOrgPermission";

export default async function SponsorsRoutePage({
  params,
  searchParams
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ updated?: string }>;
}) {
  const { orgSlug } = await params;
  const orgContext = await requireOrgPermission(orgSlug, "sponsors.read");
  const query = await searchParams;

  return <SponsorsListPage orgContext={orgContext} updated={query.updated === "1"} />;
}
