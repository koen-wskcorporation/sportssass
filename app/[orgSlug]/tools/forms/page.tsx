import { permanentRedirect } from "next/navigation";

export default async function OrgManageFormsLegacyPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  permanentRedirect(`/${orgSlug}/manage/forms`);
}
