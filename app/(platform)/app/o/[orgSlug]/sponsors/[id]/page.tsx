import { SponsorDetailPage } from "@/modules/sponsors/pages/SponsorDetailPage";
import { resolveOrg } from "@/lib/tenancy/resolveOrg";

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

  return (
    <SponsorDetailPage
      assetUploaded={query.assetUploaded === "1"}
      notesSaved={query.notesSaved === "1"}
      orgContext={orgContext}
      statusUpdated={query.statusUpdated === "1"}
      submissionId={id}
    />
  );
}
