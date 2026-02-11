import { PublicSponsorPage } from "@/modules/sponsors/pages/PublicSponsorPage";

export default async function PublicSponsorRoutePage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  return <PublicSponsorPage orgSlug={orgSlug} />;
}
