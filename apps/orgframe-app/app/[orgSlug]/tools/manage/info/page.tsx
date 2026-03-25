import { redirect } from "next/navigation";

export default async function OrgToolsManageInfoLegacyPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  redirect(`/tools/info`);
}
