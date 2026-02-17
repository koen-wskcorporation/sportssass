import { getOrgPublicContext } from "@/lib/org/getOrgPublicContext";
import { getOptionalOrgMembershipAccess } from "@/lib/org/getOptionalOrgMembershipAccess";
import { can } from "@/lib/permissions/can";
import { listOrgAnnouncements } from "@/modules/announcements/db/queries";
import { listPublishedForms, listPublishedSponsorLogos } from "@/modules/forms/db/queries";
import { getPublishedOrgPageBySlug } from "@/modules/site-builder/db/queries";

export async function getOrgSitePageForRender({
  orgSlug,
  pageSlug
}: {
  orgSlug: string;
  pageSlug: string;
}) {
  const orgContext = await getOrgPublicContext(orgSlug);

  const [membershipAccess, pageData, announcements, sponsorLogos, publishedForms] = await Promise.all([
    getOptionalOrgMembershipAccess(orgContext.orgId),
    getPublishedOrgPageBySlug({
      orgId: orgContext.orgId,
      pageSlug,
      context: {
        orgSlug: orgContext.orgSlug,
        orgName: orgContext.orgName,
        pageSlug
      }
    }),
    listOrgAnnouncements(orgContext.orgId, {
      includeUnpublished: false,
      limit: 24
    }).catch(() => []),
    listPublishedSponsorLogos(orgContext.orgId).catch(() => []),
    listPublishedForms(orgContext.orgId).catch(() => [])
  ]);

  const runtimeData = {
    announcements: announcements.map((announcement) => ({
      id: announcement.id,
      title: announcement.title,
      summary: announcement.summary,
      publishAt: announcement.publishAt,
      button: announcement.button
    })),
    sponsorLogos,
    publishedForms
  };

  if (!pageData) {
    return {
      orgContext,
      page: null,
      blocks: null,
      runtimeData,
      canEdit: membershipAccess ? can(membershipAccess.permissions, "org.pages.write") : false
    };
  }

  return {
    orgContext,
    page: pageData.page,
    blocks: pageData.blocks,
    runtimeData,
    canEdit: membershipAccess ? can(membershipAccess.permissions, "org.pages.write") : false
  };
}
