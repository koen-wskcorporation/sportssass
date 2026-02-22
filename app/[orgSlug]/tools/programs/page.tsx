import { permanentRedirect } from "next/navigation";

export default async function OrgManageProgramsLegacyPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  permanentRedirect(`/${orgSlug}/manage/programs`);
}
