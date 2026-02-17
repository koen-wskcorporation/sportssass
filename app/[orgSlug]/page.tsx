import { notFound } from "next/navigation";
import { OrgSitePage } from "@/modules/site-builder/components/OrgSitePage";
import { getOrgSitePageForRender } from "@/modules/site-builder/server/getOrgSitePageForRender";

export default async function OrgPublicHomePage({
  params,
  searchParams
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const autoOpenEditor = query.edit === "1";
  const pageData = await getOrgSitePageForRender({
    orgSlug,
    pageSlug: "home"
  });

  if (!pageData.page || !pageData.blocks) {
    notFound();
  }

  return (
    <OrgSitePage
      autoOpenEditor={autoOpenEditor}
      canEdit={pageData.canEdit}
      initialBlocks={pageData.blocks}
      initialPage={pageData.page}
      initialRuntimeData={pageData.runtimeData}
      orgName={pageData.orgContext.orgName}
      orgSlug={pageData.orgContext.orgSlug}
      pageSlug={pageData.page.slug}
    />
  );
}
