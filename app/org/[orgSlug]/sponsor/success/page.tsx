import { redirect } from "next/navigation";

export default async function LegacyOrgSponsorSuccessPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  redirect(`/app/sponsors/form/success?org=${encodeURIComponent(orgSlug)}`);
}
