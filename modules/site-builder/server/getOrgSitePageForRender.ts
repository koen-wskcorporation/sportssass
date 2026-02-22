import { getOrgRequestContext } from "@/lib/org/getOrgRequestContext";
import { getOrgAssetPublicUrl } from "@/lib/branding/getOrgAssetPublicUrl";
import { listPublishedProgramsForCatalog } from "@/modules/programs/db/queries";
import { getPublishedOrgPageBySlug } from "@/modules/site-builder/db/queries";

export async function getOrgSitePageForRender({
  orgSlug,
  pageSlug
}: {
  orgSlug: string;
  pageSlug: string;
}) {
  const orgRequest = await getOrgRequestContext(orgSlug);
  const pageData = await getPublishedOrgPageBySlug({
    orgId: orgRequest.org.orgId,
    pageSlug,
    context: {
      orgSlug: orgRequest.org.orgSlug,
      orgName: orgRequest.org.orgName,
      pageSlug
    }
  });

  const requiresProgramCatalog = pageData?.blocks.some((block) => block.type === "program_catalog") ?? false;
  const programCatalogItems = requiresProgramCatalog
    ? await listPublishedProgramsForCatalog(orgRequest.org.orgId)
        .then((items) =>
          items.map((item) => ({
            ...item,
            coverImageUrl: getOrgAssetPublicUrl(item.coverImagePath)
          }))
        )
        .catch(() => [])
    : [];

  const runtimeData = {
    programCatalogItems
  };

  if (!pageData) {
    return {
      orgContext: orgRequest.org,
      page: null,
      blocks: null,
      runtimeData,
      canEdit: orgRequest.capabilities?.pages.canWrite ?? false
    };
  }

  return {
    orgContext: orgRequest.org,
    page: pageData.page,
    blocks: pageData.blocks,
    runtimeData,
    canEdit: orgRequest.capabilities?.pages.canWrite ?? false
  };
}
