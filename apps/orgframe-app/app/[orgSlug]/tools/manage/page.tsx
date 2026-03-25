import { redirect } from "next/navigation";

export default async function OrgToolsManageLegacyPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  redirect(`/tools`);
}
