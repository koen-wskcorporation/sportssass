import { permanentRedirect } from "next/navigation";

export default async function OrgManageSiteLegacyPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  permanentRedirect(`/${orgSlug}/manage/site`);
}
