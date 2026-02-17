import type { LinkValue } from "@/lib/links";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sanitizePageSlug } from "@/modules/site-builder/blocks/helpers";
import { createDefaultOrgNavItems, type OrgNavChildItem, type OrgNavItem } from "@/modules/site-builder/nav";

const navSelect = "id, org_id, parent_id, label, link_type, page_slug, external_url, open_in_new_tab, sort_index, created_at";

type NavRow = {
  id: string;
  org_id: string;
  parent_id: string | null;
  label: string;
  link_type: "none" | "internal" | "external";
  page_slug: string | null;
  external_url: string | null;
  open_in_new_tab: boolean;
  sort_index: number;
  created_at: string;
};

function normalizeLabel(value: string) {
  const trimmed = value.trim();
  return trimmed || "Untitled";
}

function toLinkValue(row: NavRow): LinkValue | null {
  if (row.link_type === "internal" && row.page_slug) {
    return {
      type: "internal",
      pageSlug: sanitizePageSlug(row.page_slug)
    };
  }

  if (row.link_type === "external" && row.external_url) {
    const url = row.external_url.trim();

    if (!url) {
      return null;
    }

    return {
      type: "external",
      url
    };
  }

  return null;
}

function sortRows(a: NavRow, b: NavRow) {
  if (a.sort_index !== b.sort_index) {
    return a.sort_index - b.sort_index;
  }

  return a.created_at.localeCompare(b.created_at);
}

function mapRows(rows: NavRow[]): OrgNavItem[] {
  const topRows = rows.filter((row) => !row.parent_id).sort(sortRows);
  const childrenByParentId = new Map<string, NavRow[]>();

  for (const row of rows) {
    if (!row.parent_id) {
      continue;
    }

    const group = childrenByParentId.get(row.parent_id) ?? [];
    group.push(row);
    childrenByParentId.set(row.parent_id, group);
  }

  const items: OrgNavItem[] = topRows.map((row) => {
    const topLink = toLinkValue(row);
    const children = (childrenByParentId.get(row.id) ?? []).sort(sortRows);

    const mappedChildren: OrgNavChildItem[] = children
      .map((childRow) => {
        const childLink = toLinkValue(childRow);

        if (!childLink) {
          return null;
        }

        return {
          id: childRow.id,
          label: normalizeLabel(childRow.label),
          link: childLink,
          openInNewTab: childLink.type === "external" ? Boolean(childRow.open_in_new_tab) : false
        } satisfies OrgNavChildItem;
      })
      .filter((child): child is OrgNavChildItem => Boolean(child));

    return {
      id: row.id,
      label: normalizeLabel(row.label),
      link: topLink,
      openInNewTab: topLink?.type === "external" ? Boolean(row.open_in_new_tab) : false,
      children: mappedChildren
    } satisfies OrgNavItem;
  });

  return items;
}

function toInsertPayload({
  orgId,
  parentId,
  sortIndex,
  label,
  link,
  openInNewTab
}: {
  orgId: string;
  parentId: string | null;
  sortIndex: number;
  label: string;
  link: LinkValue | null;
  openInNewTab: boolean;
}) {
  return {
    org_id: orgId,
    parent_id: parentId,
    sort_index: sortIndex,
    label: normalizeLabel(label),
    link_type: link?.type ?? "none",
    page_slug: link?.type === "internal" ? sanitizePageSlug(link.pageSlug) : null,
    external_url: link?.type === "external" ? link.url.trim() : null,
    open_in_new_tab: link?.type === "external" ? Boolean(openInNewTab) : false
  };
}

export async function listOrgNavItems(orgId: string): Promise<OrgNavItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("org_nav_items").select(navSelect).eq("org_id", orgId);

  if (error) {
    throw new Error(`Failed to list org navigation: ${error.message}`);
  }

  const rows = (data ?? []) as NavRow[];
  const mapped = mapRows(rows);

  if (mapped.length === 0) {
    return createDefaultOrgNavItems();
  }

  return mapped;
}

export async function saveOrgNavItems(orgId: string, items: OrgNavItem[]): Promise<OrgNavItem[]> {
  const supabase = await createSupabaseServerClient();
  const { error: deleteError } = await supabase.from("org_nav_items").delete().eq("org_id", orgId);

  if (deleteError) {
    throw new Error(`Failed to reset org navigation: ${deleteError.message}`);
  }

  for (const [topIndex, item] of items.entries()) {
    const { data: insertedParent, error: parentInsertError } = await supabase
      .from("org_nav_items")
      .insert(
        toInsertPayload({
          orgId,
          parentId: null,
          sortIndex: topIndex,
          label: item.label,
          link: item.link,
          openInNewTab: item.openInNewTab
        })
      )
      .select("id")
      .single();

    if (parentInsertError || !insertedParent) {
      throw new Error(`Failed to save navigation item: ${parentInsertError?.message ?? "insert failed"}`);
    }

    const parentId = String((insertedParent as { id: string }).id);

    if (!item.children.length) {
      continue;
    }

    const childRows = item.children.map((child, childIndex) =>
      toInsertPayload({
        orgId,
        parentId,
        sortIndex: childIndex,
        label: child.label,
        link: child.link,
        openInNewTab: child.openInNewTab
      })
    );

    const { error: childInsertError } = await supabase.from("org_nav_items").insert(childRows);

    if (childInsertError) {
      throw new Error(`Failed to save navigation dropdown items: ${childInsertError.message}`);
    }
  }

  return listOrgNavItems(orgId);
}
