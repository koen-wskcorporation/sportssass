"use server";

import { requireOrgPermission } from "@/lib/permissions/requireOrgPermission";
import { rethrowIfNavigationError } from "@/lib/actions/rethrowIfNavigationError";
import { normalizeSitePageLayout, type SitePageKey } from "@/modules/site-builder/registry";
import { publishSitePageLayout } from "@/modules/site-builder/db/queries";
import type { SitePageLayout } from "@/modules/site-builder/types";

export type PublishSitePageInput = {
  orgSlug: string;
  pageKey: SitePageKey;
  layout: SitePageLayout;
};

export type PublishSitePageResult =
  | {
      ok: true;
      layout: SitePageLayout;
    }
  | {
      ok: false;
      error: string;
    };

export async function publishSitePageAction(input: PublishSitePageInput): Promise<PublishSitePageResult> {
  try {
    const orgContext = await requireOrgPermission(input.orgSlug, "org.site.write");
    const normalizedLayout = normalizeSitePageLayout(input.pageKey, input.layout, {
      orgName: orgContext.orgName,
      orgSlug: orgContext.orgSlug
    });

    await publishSitePageLayout({
      orgId: orgContext.orgId,
      pageKey: input.pageKey,
      layout: normalizedLayout
    });

    return {
      ok: true,
      layout: normalizedLayout
    };
  } catch (error) {
    rethrowIfNavigationError(error);
    return {
      ok: false,
      error: "Unable to publish page right now. Please try again."
    };
  }
}
