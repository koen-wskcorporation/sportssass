import { SponsorDetailPage } from "@/modules/sponsors/pages/SponsorDetailPage";
import { resolveOrg } from "@/lib/tenancy/resolveOrg";
import { hasPermissions } from "@/modules/core/tools/access";

export default async function SponsorDetailRoutePage({
  params,
  searchParams
}: {
  params: Promise<{ orgSlug: string; id: string }>;
  searchParams: Promise<{ statusUpdated?: string; notesSaved?: string; assetUploaded?: string }>;
}) {
  const { orgSlug, id } = await params;
  const orgContext = await resolveOrg(orgSlug);
  const query = await searchParams;
  const canManage = hasPermissions(orgContext.membershipRole, ["sponsors.write"]);

  return (
    <SponsorDetailPage
      assetUploaded={query.assetUploaded === "1"}
      canManage={canManage}
      notesSaved={query.notesSaved === "1"}
      orgContext={orgContext}
      statusUpdated={query.statusUpdated === "1"}
      submissionId={id}
    />
  );
}
