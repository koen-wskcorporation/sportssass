import { permanentRedirect } from "next/navigation";

export default async function OrgBillingLegacyPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  permanentRedirect(`/${orgSlug}/manage/billing`);
}
