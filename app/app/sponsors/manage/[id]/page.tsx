import type { Metadata } from "next";
import { SponsorDetailPage } from "@/modules/sponsors/pages/SponsorDetailPage";
import { OrgWorkspaceFrame } from "@/components/shared/OrgWorkspaceFrame";
import { requirePermission } from "@/lib/auth/requirePermission";
import { getOrgContextFromSearchParams, getOrgSlugFromSearchParams } from "@/lib/tenancy/getOrgContext";
import { hasPermissions } from "@/modules/core/tools/access";

type SponsorsManageDetailSearchParams = {
  org?: string | string[];
  statusUpdated?: string;
  notesSaved?: string;
  assetUploaded?: string;
};

export async function generateMetadata({
  searchParams
}: {
  searchParams: Promise<SponsorsManageDetailSearchParams>;
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

export default async function SponsorsManageDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SponsorsManageDetailSearchParams>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const orgContext = await getOrgContextFromSearchParams(query, "auth");

  requirePermission(orgContext.membershipRole, "sponsors.read");

  return (
    <OrgWorkspaceFrame orgContext={orgContext}>
      <SponsorDetailPage
        assetUploaded={query.assetUploaded === "1"}
        canManage={hasPermissions(orgContext.membershipRole, ["sponsors.write"])}
        notesSaved={query.notesSaved === "1"}
        orgContext={orgContext}
        statusUpdated={query.statusUpdated === "1"}
        submissionId={id}
      />
    </OrgWorkspaceFrame>
  );
}
