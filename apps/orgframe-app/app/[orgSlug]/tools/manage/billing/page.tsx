import { redirect } from "next/navigation";

export default async function OrgToolsManageBillingLegacyPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  redirect("/tools/billing");
}
