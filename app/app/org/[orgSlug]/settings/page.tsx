import { redirect } from "next/navigation";

export default async function LegacyOrgSettingsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  redirect(`/org/${orgSlug}/settings`);
}
