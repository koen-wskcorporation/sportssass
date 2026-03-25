import { redirect } from "next/navigation";

export default async function OrgToolsManageDomainsLegacyPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  redirect(`/tools/domains`);
}
