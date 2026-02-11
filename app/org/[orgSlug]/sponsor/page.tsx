import { redirect } from "next/navigation";

export default async function LegacyOrgSponsorPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  redirect(`/app/sponsors/form?org=${encodeURIComponent(orgSlug)}`);
}
