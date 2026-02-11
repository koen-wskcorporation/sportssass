import type { Metadata } from "next";
import { SponsorsListPage } from "@/modules/sponsors/pages/SponsorsListPage";
import { OrgWorkspaceFrame } from "@/components/shared/OrgWorkspaceFrame";
import { requirePermission } from "@/lib/auth/requirePermission";
import { getOrgContextFromSearchParams, getOrgSlugFromSearchParams } from "@/lib/tenancy/getOrgContext";

type SponsorsManageSearchParams = {
  org?: string | string[];
  updated?: string;
};

export async function generateMetadata({
  searchParams
}: {
  searchParams: Promise<SponsorsManageSearchParams>;
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

export default async function SponsorsManagePage({
  searchParams
}: {
  searchParams: Promise<SponsorsManageSearchParams>;
}) {
  const query = await searchParams;
  const orgContext = await getOrgContextFromSearchParams(query, "auth");
  requirePermission(orgContext.membershipRole, "sponsors.read");

  return (
    <OrgWorkspaceFrame orgContext={orgContext}>
      <SponsorsListPage orgContext={orgContext} updated={query.updated === "1"} />
    </OrgWorkspaceFrame>
  );
}
