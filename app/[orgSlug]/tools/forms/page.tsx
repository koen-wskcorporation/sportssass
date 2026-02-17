import { getFormsManagePageData } from "@/modules/forms/actions";
import { FormsListPage } from "@/modules/forms/components/FormsListPage";

export default async function OrgFormsToolsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const data = await getFormsManagePageData(orgSlug);

  return <FormsListPage canWrite={data.canWrite} forms={data.forms} orgSlug={data.orgSlug} />;
}
