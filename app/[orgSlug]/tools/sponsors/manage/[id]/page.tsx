import { getOrgAuthContext } from "@/lib/org/getOrgAuthContext";
import { can } from "@/lib/permissions/can";
import { SponsorDetailPage } from "@/modules/sponsors/pages/SponsorDetailPage";

type SponsorsManageDetailSearchParams = {
  statusUpdated?: string;
  error?: string;
};

export default async function SponsorsManageDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ orgSlug: string; id: string }>;
  searchParams: Promise<SponsorsManageDetailSearchParams>;
}) {
  const { id, orgSlug } = await params;
  const query = await searchParams;
  const orgContext = await getOrgAuthContext(orgSlug);

  return (
    <SponsorDetailPage
      canManage={can(orgContext.membershipPermissions, "sponsors.write")}
      errorCode={query.error}
      orgContext={orgContext}
      profileId={id}
      statusUpdated={query.statusUpdated === "1"}
    />
  );
}
