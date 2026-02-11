import { redirect } from "next/navigation";

export default async function LegacyOrgWorkspacePage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  redirect(`/app/sponsors/manage?org=${encodeURIComponent(orgSlug)}`);
}
