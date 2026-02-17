"use server";

import { z } from "zod";
import { getOrgPublicContext } from "@/lib/org/getOrgPublicContext";
import { getOptionalOrgMembershipAccess } from "@/lib/org/getOptionalOrgMembershipAccess";
import { can } from "@/lib/permissions/can";
import { requireOrgPermission } from "@/lib/permissions/requireOrgPermission";
import { rethrowIfNavigationError } from "@/lib/actions/rethrowIfNavigationError";
import { defaultPageTitleFromSlug, isReservedPageSlug, sanitizePageSlug } from "@/modules/site-builder/blocks/helpers";
import {
  deleteOrgPageById,
  duplicateOrgPageWithBlocks,
  ensureOrgPageExists,
  getOrgPageById,
  getEditableOrgPageBySlug,
  getPublishedOrgPageBySlug,
  listOrgPagesForManage,
  listOrgPagesForLinkPicker,
  reorderOrgPages,
  saveOrgPageAndBlocks,
  updateOrgPageSettingsById
} from "@/modules/site-builder/db/queries";
import { listOrgNavItems, saveOrgNavItems } from "@/modules/site-builder/db/nav-queries";
import { ORG_NAV_MAX_CHILD_ITEMS, ORG_NAV_MAX_TOP_LEVEL_ITEMS, createDefaultOrgNavItems, type OrgNavItem } from "@/modules/site-builder/nav";
import type { LinkPickerPageOption } from "@/lib/links";
import type { DraftBlockInput, OrgManagePage, OrgPageBlock, OrgSitePage } from "@/modules/site-builder/types";

export type LoadOrgPageInput = {
  orgSlug: string;
  pageSlug: string;
};

export type LoadOrgPageResult =
  | {
      ok: true;
      page: OrgSitePage;
      blocks: OrgPageBlock[];
      canEdit: boolean;
    }
  | {
      ok: false;
      error: "not_found" | "forbidden" | "unknown";
    };

export async function loadOrgPageAction(input: LoadOrgPageInput): Promise<LoadOrgPageResult> {
  try {
    const pageSlug = sanitizePageSlug(input.pageSlug);
    const org = await getOrgPublicContext(input.orgSlug);
    const membershipAccess = await getOptionalOrgMembershipAccess(org.orgId);

    const canReadEditorData = membershipAccess ? can(membershipAccess.permissions, "org.pages.read") : false;
    const canEdit = membershipAccess ? can(membershipAccess.permissions, "org.pages.write") : false;

    const pageData = canReadEditorData
      ? await getEditableOrgPageBySlug({
          orgId: org.orgId,
          pageSlug,
          context: {
            orgSlug: org.orgSlug,
            orgName: org.orgName,
            pageSlug
          }
        })
      : await getPublishedOrgPageBySlug({
          orgId: org.orgId,
          pageSlug,
          context: {
            orgSlug: org.orgSlug,
            orgName: org.orgName,
            pageSlug
          }
        });

    if (!pageData) {
      return {
        ok: false,
        error: "not_found"
      };
    }

    return {
      ok: true,
      page: pageData.page,
      blocks: pageData.blocks,
      canEdit
    };
  } catch (error) {
    rethrowIfNavigationError(error);

    return {
      ok: false,
      error: "unknown"
    };
  }
}

export type SaveOrgPageInput = {
  orgSlug: string;
  pageSlug: string;
  title: string;
  isPublished: boolean;
  blocks: DraftBlockInput[];
};

export type SaveOrgPageResult =
  | {
      ok: true;
      page: OrgSitePage;
      blocks: OrgPageBlock[];
    }
  | {
      ok: false;
      error: string;
    };

export async function saveOrgPageAction(input: SaveOrgPageInput): Promise<SaveOrgPageResult> {
  try {
    const pageSlug = sanitizePageSlug(input.pageSlug);
    const org = await requireOrgPermission(input.orgSlug, "org.pages.write");

    const saved = await saveOrgPageAndBlocks({
      orgId: org.orgId,
      pageSlug,
      title: input.title,
      isPublished: input.isPublished,
      blocks: input.blocks,
      context: {
        orgSlug: org.orgSlug,
        orgName: org.orgName,
        pageSlug
      }
    });

    return {
      ok: true,
      page: saved.page,
      blocks: saved.blocks
    };
  } catch (error) {
    rethrowIfNavigationError(error);

    return {
      ok: false,
      error: "Unable to save this page right now."
    };
  }
}

type ListOrgPagesForLinkPickerResult =
  | {
      ok: true;
      pages: LinkPickerPageOption[];
    }
  | {
      ok: false;
      error: string;
    };

export async function listOrgPagesForLinkPickerAction(input: { orgSlug: string }): Promise<ListOrgPagesForLinkPickerResult> {
  try {
    const org = await getOrgPublicContext(input.orgSlug);
    const membershipAccess = await getOptionalOrgMembershipAccess(org.orgId);
    const canReadPages = membershipAccess
      ? can(membershipAccess.permissions, "org.pages.read") || can(membershipAccess.permissions, "org.pages.write")
      : false;

    if (!canReadPages) {
      return {
        ok: true,
        pages: [
          {
            slug: "home",
            title: "Home",
            isPublished: true
          }
        ]
      };
    }

    const pages = await listOrgPagesForLinkPicker(org.orgId);

    return {
      ok: true,
      pages
    };
  } catch (error) {
    rethrowIfNavigationError(error);

    return {
      ok: false,
      error: "Unable to load page links right now."
    };
  }
}

type ManagePagesActionResult =
  | {
      ok: true;
      pages: OrgManagePage[];
    }
  | {
      ok: false;
      error: string;
    };

function normalizePageTitleInput(title: string, pageSlug: string) {
  const trimmedTitle = title.trim();

  if (trimmedTitle) {
    return trimmedTitle.slice(0, 120);
  }

  return defaultPageTitleFromSlug(pageSlug);
}

function validatePageSlugForManage(normalizedSlug: string) {
  if (normalizedSlug !== "home" && isReservedPageSlug(normalizedSlug)) {
    return "That URL is reserved by the system. Choose a different page URL.";
  }

  return null;
}

function replaceNavPageSlug(items: OrgNavItem[], sourceSlug: string, nextSlug: string): OrgNavItem[] {
  return items.map((item) => ({
    ...item,
    link:
      item.link?.type === "internal" && item.link.pageSlug === sourceSlug
        ? {
            type: "internal",
            pageSlug: nextSlug
          }
        : item.link,
    children: item.children.map((child) => ({
      ...child,
      link:
        child.link.type === "internal" && child.link.pageSlug === sourceSlug
          ? {
              type: "internal",
              pageSlug: nextSlug
            }
          : child.link
    }))
  }));
}

function removeNavLinksForPage(items: OrgNavItem[], pageSlug: string): OrgNavItem[] {
  const filtered = items
    .map((item) => {
      const children = item.children.filter((child) => !(child.link.type === "internal" && child.link.pageSlug === pageSlug));
      const shouldDropTopLink = item.link?.type === "internal" && item.link.pageSlug === pageSlug;
      const nextLink = shouldDropTopLink ? null : item.link;

      if (!nextLink && children.length === 0) {
        return null;
      }

      return {
        ...item,
        link: nextLink,
        children
      } satisfies OrgNavItem;
    })
    .filter((item): item is OrgNavItem => Boolean(item));

  if (filtered.length === 0) {
    return createDefaultOrgNavItems();
  }

  return filtered;
}

async function findNextDuplicatePageSlug({
  orgId,
  orgSlug,
  orgName,
  sourceSlug
}: {
  orgId: string;
  orgSlug: string;
  orgName: string;
  sourceSlug: string;
}) {
  const rawBase = sourceSlug === "home" ? "home-copy" : `${sourceSlug}-copy`;
  const baseSlug = sanitizePageSlug(rawBase);
  const sanitizedBase = validatePageSlugForManage(baseSlug) ? sanitizePageSlug(`page-${baseSlug}`) : baseSlug;

  for (let index = 0; index < 200; index += 1) {
    const candidateSlug = index === 0 ? sanitizedBase : sanitizePageSlug(`${sanitizedBase}-${index + 1}`);
    const existing = await getEditableOrgPageBySlug({
      orgId,
      pageSlug: candidateSlug,
      context: {
        orgSlug,
        orgName,
        pageSlug: candidateSlug
      }
    });

    if (!existing) {
      return candidateSlug;
    }
  }

  return null;
}

const savePageSettingsSchema = z.object({
  orgSlug: z.string().trim().min(1),
  pageId: z.string().trim().uuid(),
  title: z.string().trim().max(120),
  pageSlug: z.string().trim().min(1).max(120),
  isPublished: z.boolean()
});

export async function savePageSettingsAction(input: {
  orgSlug: string;
  pageId: string;
  title: string;
  pageSlug: string;
  isPublished: boolean;
}): Promise<ManagePagesActionResult> {
  const parsed = savePageSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the page name and URL."
    };
  }

  try {
    const payload = parsed.data;
    const org = await requireOrgPermission(payload.orgSlug, "org.pages.write");
    const currentPage = await getOrgPageById(org.orgId, payload.pageId);

    if (!currentPage) {
      return {
        ok: false,
        error: "This page no longer exists."
      };
    }

    const requestedSlug = sanitizePageSlug(payload.pageSlug);
    const slugError = validatePageSlugForManage(requestedSlug);

    if (slugError) {
      return {
        ok: false,
        error: slugError
      };
    }

    if (currentPage.slug === "home" && requestedSlug !== "home") {
      return {
        ok: false,
        error: "The Home page URL is fixed to /."
      };
    }

    if (currentPage.slug !== "home" && requestedSlug === "home") {
      return {
        ok: false,
        error: "Another page is already using the Home URL."
      };
    }

    if (requestedSlug !== currentPage.slug) {
      const existing = await getEditableOrgPageBySlug({
        orgId: org.orgId,
        pageSlug: requestedSlug,
        context: {
          orgSlug: org.orgSlug,
          orgName: org.orgName,
          pageSlug: requestedSlug
        }
      });

      if (existing && existing.page.id !== currentPage.id) {
        return {
          ok: false,
          error: "Another page is already using that URL."
        };
      }
    }

    const nextTitle = normalizePageTitleInput(payload.title, requestedSlug);
    await updateOrgPageSettingsById({
      orgId: org.orgId,
      pageId: currentPage.id,
      title: nextTitle,
      slug: requestedSlug,
      isPublished: payload.isPublished
    });

    if (requestedSlug !== currentPage.slug) {
      const navItems = await listOrgNavItems(org.orgId);
      const remappedNavItems = replaceNavPageSlug(navItems, currentPage.slug, requestedSlug);
      await saveOrgNavItems(org.orgId, remappedNavItems);
    }

    const pages = await listOrgPagesForManage(org.orgId);

    return {
      ok: true,
      pages
    };
  } catch (error) {
    rethrowIfNavigationError(error);

    return {
      ok: false,
      error: "Unable to save page settings right now."
    };
  }
}

const createManagedPageSchema = z.object({
  orgSlug: z.string().trim().min(1),
  title: z.string().trim().max(120),
  pageSlug: z.string().trim().min(1).max(120),
  isPublished: z.boolean()
});

export async function createManagedPageAction(input: {
  orgSlug: string;
  title: string;
  pageSlug: string;
  isPublished: boolean;
}): Promise<ManagePagesActionResult> {
  const parsed = createManagedPageSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the page name and URL."
    };
  }

  try {
    const payload = parsed.data;
    const org = await requireOrgPermission(payload.orgSlug, "org.pages.write");
    const normalizedSlug = sanitizePageSlug(payload.pageSlug);
    const slugError = validatePageSlugForManage(normalizedSlug);

    if (slugError) {
      return {
        ok: false,
        error: slugError
      };
    }

    const existing = await getEditableOrgPageBySlug({
      orgId: org.orgId,
      pageSlug: normalizedSlug,
      context: {
        orgSlug: org.orgSlug,
        orgName: org.orgName,
        pageSlug: normalizedSlug
      }
    });

    if (existing) {
      return {
        ok: false,
        error: "Another page is already using that URL."
      };
    }

    const nextTitle = normalizePageTitleInput(payload.title, normalizedSlug);
    const created = await ensureOrgPageExists({
      orgId: org.orgId,
      pageSlug: normalizedSlug,
      title: nextTitle,
      context: {
        orgSlug: org.orgSlug,
        orgName: org.orgName,
        pageSlug: normalizedSlug
      }
    });

    if (!payload.isPublished) {
      await updateOrgPageSettingsById({
        orgId: org.orgId,
        pageId: created.page.id,
        title: nextTitle,
        slug: normalizedSlug,
        isPublished: false
      });
    }

    const pages = await listOrgPagesForManage(org.orgId);

    return {
      ok: true,
      pages
    };
  } catch (error) {
    rethrowIfNavigationError(error);

    return {
      ok: false,
      error: "Unable to create this page right now."
    };
  }
}

const duplicatePageSchema = z.object({
  orgSlug: z.string().trim().min(1),
  pageId: z.string().trim().uuid()
});

export async function duplicateManagedPageAction(input: { orgSlug: string; pageId: string }): Promise<ManagePagesActionResult> {
  const parsed = duplicatePageSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Unable to duplicate this page."
    };
  }

  try {
    const payload = parsed.data;
    const org = await requireOrgPermission(payload.orgSlug, "org.pages.write");
    const sourcePage = await getOrgPageById(org.orgId, payload.pageId);

    if (!sourcePage) {
      return {
        ok: false,
        error: "This page no longer exists."
      };
    }

    const duplicateSlug = await findNextDuplicatePageSlug({
      orgId: org.orgId,
      orgSlug: org.orgSlug,
      orgName: org.orgName,
      sourceSlug: sourcePage.slug
    });

    if (!duplicateSlug) {
      return {
        ok: false,
        error: "Unable to find a URL for the duplicate page."
      };
    }

    const duplicateTitle = `${sourcePage.title} Copy`.slice(0, 120);
    await duplicateOrgPageWithBlocks({
      orgId: org.orgId,
      sourcePageId: sourcePage.id,
      slug: duplicateSlug,
      title: duplicateTitle
    });

    const pages = await listOrgPagesForManage(org.orgId);

    return {
      ok: true,
      pages
    };
  } catch (error) {
    rethrowIfNavigationError(error);

    return {
      ok: false,
      error: "Unable to duplicate this page right now."
    };
  }
}

const deletePageSchema = z.object({
  orgSlug: z.string().trim().min(1),
  pageId: z.string().trim().uuid()
});

export async function deleteManagedPageAction(input: { orgSlug: string; pageId: string }): Promise<ManagePagesActionResult> {
  const parsed = deletePageSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Unable to delete this page."
    };
  }

  try {
    const payload = parsed.data;
    const org = await requireOrgPermission(payload.orgSlug, "org.pages.write");
    const page = await getOrgPageById(org.orgId, payload.pageId);

    if (!page) {
      return {
        ok: false,
        error: "This page no longer exists."
      };
    }

    if (page.slug === "home") {
      return {
        ok: false,
        error: "Home can't be deleted."
      };
    }

    const deleted = await deleteOrgPageById(org.orgId, page.id);

    if (!deleted) {
      return {
        ok: false,
        error: "This page no longer exists."
      };
    }

    const navItems = await listOrgNavItems(org.orgId);
    const nextNavItems = removeNavLinksForPage(navItems, page.slug);
    await saveOrgNavItems(org.orgId, nextNavItems);

    const pagesAfterDelete = await listOrgPagesForManage(org.orgId);
    const orderedIds = pagesAfterDelete.map((item) => item.id);
    const pages = await reorderOrgPages(org.orgId, orderedIds);

    return {
      ok: true,
      pages
    };
  } catch (error) {
    rethrowIfNavigationError(error);

    return {
      ok: false,
      error: "Unable to delete this page right now."
    };
  }
}

const reorderPagesSchema = z.object({
  orgSlug: z.string().trim().min(1),
  pageIds: z.array(z.string().trim().uuid()).min(1)
});

export async function reorderManagedPagesAction(input: { orgSlug: string; pageIds: string[] }): Promise<ManagePagesActionResult> {
  const parsed = reorderPagesSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Unable to reorder pages."
    };
  }

  try {
    const payload = parsed.data;
    const org = await requireOrgPermission(payload.orgSlug, "org.pages.write");
    const currentPages = await listOrgPagesForManage(org.orgId);

    if (currentPages.length !== payload.pageIds.length) {
      return {
        ok: false,
        error: "Page order is out of date. Refresh and try again."
      };
    }

    const currentIds = new Set(currentPages.map((page) => page.id));
    const nextIds = new Set(payload.pageIds);

    if (currentIds.size !== nextIds.size || [...currentIds].some((id) => !nextIds.has(id))) {
      return {
        ok: false,
        error: "Page order is out of date. Refresh and try again."
      };
    }

    const pages = await reorderOrgPages(org.orgId, payload.pageIds);

    return {
      ok: true,
      pages
    };
  } catch (error) {
    rethrowIfNavigationError(error);

    return {
      ok: false,
      error: "Unable to reorder pages right now."
    };
  }
}

const navLinkSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("internal"),
    pageSlug: z.string().trim().min(1).max(120)
  }),
  z.object({
    type: z.literal("external"),
    url: z
      .string()
      .trim()
      .min(1)
      .max(2048)
      .refine((value) => /^https?:\/\//i.test(value), "External URL must start with http:// or https://")
  })
]);

const navChildSchema = z.object({
  id: z.string().trim().min(1).max(128).optional(),
  label: z.string().trim().min(1).max(48),
  link: navLinkSchema,
  openInNewTab: z.boolean().optional()
});

const navItemSchema = z.object({
  id: z.string().trim().min(1).max(128).optional(),
  label: z.string().trim().min(1).max(48),
  link: navLinkSchema.nullable(),
  openInNewTab: z.boolean().optional(),
  children: z.array(navChildSchema).max(ORG_NAV_MAX_CHILD_ITEMS)
});

const saveOrgNavSchema = z
  .object({
    orgSlug: z.string().trim().min(1),
    items: z.array(navItemSchema).min(1).max(ORG_NAV_MAX_TOP_LEVEL_ITEMS)
  })
  .superRefine((value, ctx) => {
    value.items.forEach((item, index) => {
      if (!item.link && item.children.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Menus need at least one link.",
          path: ["items", index, "children"]
        });
      }
    });
  });

type SaveOrgNavItemsResult =
  | {
      ok: true;
      items: OrgNavItem[];
    }
  | {
      ok: false;
      error: string;
    };

export async function saveOrgNavItemsAction(input: { orgSlug: string; items: OrgNavItem[] }): Promise<SaveOrgNavItemsResult> {
  const parsed = saveOrgNavSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Provide valid navigation items."
    };
  }

  try {
    const payload = parsed.data;
    const org = await requireOrgPermission(payload.orgSlug, "org.pages.write");
    const sanitizedItems: OrgNavItem[] = payload.items.map((item, topIndex) => ({
      id: item.id ?? `tmp-top-${topIndex}`,
      label: item.label.trim(),
      link:
        item.link?.type === "internal"
          ? {
              type: "internal",
              pageSlug: sanitizePageSlug(item.link.pageSlug)
            }
          : item.link
            ? {
                type: "external",
                url: item.link.url.trim()
              }
            : null,
      openInNewTab: item.link?.type === "external" ? Boolean(item.openInNewTab) : false,
      children: item.children.map((child, childIndex) => ({
        id: child.id ?? `tmp-child-${topIndex}-${childIndex}`,
        label: child.label.trim(),
        link:
          child.link.type === "internal"
            ? {
                type: "internal",
                pageSlug: sanitizePageSlug(child.link.pageSlug)
              }
            : {
                type: "external",
                url: child.link.url.trim()
              },
        openInNewTab: child.link.type === "external" ? Boolean(child.openInNewTab) : false
      }))
    }));

    const savedItems = await saveOrgNavItems(org.orgId, sanitizedItems);

    return {
      ok: true,
      items: savedItems
    };
  } catch (error) {
    rethrowIfNavigationError(error);

    return {
      ok: false,
      error: "Unable to save navigation right now."
    };
  }
}

const createOrgPageSchema = z.object({
  orgSlug: z.string().trim().min(1),
  pageSlug: z.string().trim().min(1).max(120),
  title: z.string().trim().max(120).optional()
});

type CreateOrgPageResult =
  | {
      ok: true;
      pageSlug: string;
      created: boolean;
    }
  | {
      ok: false;
      error: string;
    };

export async function createOrgPageAction(input: {
  orgSlug: string;
  pageSlug: string;
  title?: string;
}): Promise<CreateOrgPageResult> {
  const parsed = createOrgPageSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Provide a valid page slug and title."
    };
  }

  try {
    const payload = parsed.data;
    const normalizedPageSlug = sanitizePageSlug(payload.pageSlug);
    const org = await requireOrgPermission(payload.orgSlug, "org.pages.write");

    if (normalizedPageSlug !== "home" && isReservedPageSlug(normalizedPageSlug)) {
      return {
        ok: false,
        error: "That URL is reserved by the system. Choose a different page URL."
      };
    }

    const existing = await getEditableOrgPageBySlug({
      orgId: org.orgId,
      pageSlug: normalizedPageSlug,
      context: {
        orgSlug: org.orgSlug,
        orgName: org.orgName,
        pageSlug: normalizedPageSlug
      }
    });

    if (existing) {
      return {
        ok: true,
        pageSlug: existing.page.slug,
        created: false
      };
    }

    const created = await ensureOrgPageExists({
      orgId: org.orgId,
      pageSlug: normalizedPageSlug,
      title: payload.title,
      context: {
        orgSlug: org.orgSlug,
        orgName: org.orgName,
        pageSlug: normalizedPageSlug
      }
    });

    return {
      ok: true,
      pageSlug: created.page.slug,
      created: true
    };
  } catch (error) {
    rethrowIfNavigationError(error);

    return {
      ok: false,
      error: "Unable to create this page right now."
    };
  }
}
