import { redirect } from "next/navigation";

export default async function OrgBrandingAliasPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  redirect(`/app/org/${orgSlug}/settings/branding`);
}
