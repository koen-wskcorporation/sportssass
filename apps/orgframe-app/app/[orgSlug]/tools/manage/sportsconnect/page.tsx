import { redirect } from "next/navigation";

export default async function OrgToolsManageSportsConnectLegacyPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  redirect(`/tools/sportsconnect`);
}
