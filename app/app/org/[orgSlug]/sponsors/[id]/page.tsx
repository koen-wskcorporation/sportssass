import { redirect } from "next/navigation";

export default async function LegacyOrgSponsorDetailPage({
  params
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = await params;
  redirect(`/app/sponsors/manage/${id}?org=${encodeURIComponent(orgSlug)}`);
}
