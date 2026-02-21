import { getOrgRequestContext } from "@/lib/org/getOrgRequestContext";
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

  const runtimeData = {};

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
