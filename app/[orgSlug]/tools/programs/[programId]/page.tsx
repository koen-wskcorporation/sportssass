import { permanentRedirect } from "next/navigation";

export default async function OrgManageProgramDetailLegacyPage({
  params
}: {
  params: Promise<{ orgSlug: string; programId: string }>;
}) {
  const { orgSlug, programId } = await params;
  permanentRedirect(`/${orgSlug}/manage/programs/${programId}`);
}
