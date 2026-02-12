import type { Metadata } from "next";
import { SponsorDetailPage } from "@/modules/sponsors/pages/SponsorDetailPage";
import { can } from "@/lib/permissions/can";
import { getOrgAuthContext } from "@/lib/org/getOrgAuthContext";

type SponsorsManageDetailSearchParams = {
  statusUpdated?: string;
  notesSaved?: string;
  assetUploaded?: string;
  error?: string;
};

export async function generateMetadata({ params }: { params: Promise<{ orgSlug: string }> }): Promise<Metadata> {
  const { orgSlug } = await params;

  return {
    icons: {
      icon: `/${orgSlug}/icon`
    }
  };
}

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
      assetUploaded={query.assetUploaded === "1"}
      assetUploadErrorCode={query.error}
      canManage={can(orgContext.membershipRole, "sponsors.write")}
      notesSaved={query.notesSaved === "1"}
      orgContext={orgContext}
      statusUpdated={query.statusUpdated === "1"}
      submissionId={id}
    />
  );
}
