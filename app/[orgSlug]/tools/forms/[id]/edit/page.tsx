import { notFound } from "next/navigation";
import { getFormEditorPageData } from "@/modules/forms/actions";
import { FormBuilderPage } from "@/modules/forms/components/FormBuilderPage";

export default async function OrgFormEditPage({
  params
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = await params;
  const data = await getFormEditorPageData({
    orgSlug,
    formId: id
  });

  if (!data.ok) {
    notFound();
  }

  return <FormBuilderPage canWrite={data.canWrite} form={data.form} latestPublishedVersion={data.latestPublishedVersion} orgSlug={data.orgSlug} />;
}
