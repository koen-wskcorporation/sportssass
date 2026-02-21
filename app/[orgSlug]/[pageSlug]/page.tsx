import { notFound, redirect } from "next/navigation";
import { OrgSitePage } from "@/modules/site-builder/components/OrgSitePage";
import { getOrgSitePageForRender } from "@/modules/site-builder/server/getOrgSitePageForRender";

export default async function OrgPublicPageBySlug({
  params,
  searchParams
}: {
  params: Promise<{ orgSlug: string; pageSlug: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { orgSlug, pageSlug } = await params;
  const query = await searchParams;
  const initialMode = query.edit === "1" ? "edit" : "view";

  if (pageSlug.toLowerCase() === "home") {
    redirect(`/${orgSlug}`);
  }

  const pageData = await getOrgSitePageForRender({
    orgSlug,
    pageSlug
  });

  if (!pageData.page || !pageData.blocks) {
    notFound();
  }

  return (
    <OrgSitePage
      canEdit={pageData.canEdit}
      initialBlocks={pageData.blocks}
      initialMode={initialMode}
      initialPage={pageData.page}
      initialRuntimeData={pageData.runtimeData}
      orgName={pageData.orgContext.orgName}
      orgSlug={pageData.orgContext.orgSlug}
      pageSlug={pageData.page.slug}
    />
  );
}
