import { permanentRedirect } from "next/navigation";

export default async function OrgManageFormDetailLegacyPage({
  params
}: {
  params: Promise<{ orgSlug: string; formId: string }>;
}) {
  const { orgSlug, formId } = await params;
  permanentRedirect(`/${orgSlug}/manage/forms/${formId}`);
}
