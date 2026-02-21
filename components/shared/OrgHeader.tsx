"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Copy, Eye, EyeOff, GripVertical, Pencil, Plus, Settings, SlidersHorizontal, Trash2 } from "lucide-react";
import { SortableCanvas, type SortableRenderMeta } from "@/components/editor/SortableCanvas";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NavItem } from "@/components/ui/nav-item";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { sanitizePageSlug } from "@/modules/site-builder/blocks/helpers";
import { saveOrgPagesAction } from "@/modules/site-builder/actions";
import { ORG_SITE_OPEN_EDITOR_EVENT, ORG_SITE_OPEN_EDITOR_REQUEST_KEY } from "@/modules/site-builder/events";
import type { OrgManagePage } from "@/modules/site-builder/types";

type OrgHeaderProps = {
  orgSlug: string;
  orgName: string;
  orgLogoUrl?: string | null;
  governingBodyLogoUrl?: string | null;
  governingBodyName?: string | null;
  canManageOrg: boolean;
  canEditPages: boolean;
  pages: OrgManagePage[];
};

type AddPageState = {
  title: string;
  slug: string;
  isPublished: boolean;
};

function getOrgInitial(orgName: string) {
  return orgName.trim().charAt(0).toUpperCase() || "O";
}

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function pageHref(orgSlug: string, pageSlug: string) {
  return pageSlug === "home" ? `/${orgSlug}` : `/${orgSlug}/${pageSlug}`;
}

function isActivePath(pathname: string, href: string) {
  const current = normalizePath(pathname);
  const normalizedHref = normalizePath(href);

  if (normalizedHref === `/${pathname.split("/")[1]}`) {
    return current === normalizedHref;
  }

  return current === normalizedHref;
}

function isEditablePublicOrgPath(pathname: string, orgBasePath: string) {
  if (pathname === orgBasePath) {
    return true;
  }

  if (!pathname.startsWith(`${orgBasePath}/`)) {
    return false;
  }

  return !pathname.startsWith(`${orgBasePath}/manage`) && !pathname.startsWith(`${orgBasePath}/icon`);
}

function sortedPages(pages: OrgManagePage[]) {
  return [...pages].sort((a, b) => a.sortIndex - b.sortIndex || a.createdAt.localeCompare(b.createdAt));
}

export function OrgHeader({ orgSlug, orgName, orgLogoUrl, governingBodyLogoUrl, governingBodyName, canManageOrg, canEditPages, pages }: OrgHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const orgBasePath = `/${orgSlug}`;
  const canEditCurrentPage = canEditPages && isEditablePublicOrgPath(pathname, orgBasePath);
  const [isEditingMenu, setIsEditingMenu] = useState(false);
  const [localPages, setLocalPages] = useState<OrgManagePage[]>(() => sortedPages(pages));
  const [addPageOpen, setAddPageOpen] = useState(false);
  const [addPageState, setAddPageState] = useState<AddPageState>({
    title: "",
    slug: "",
    isPublished: true
  });
  const [settingsTarget, setSettingsTarget] = useState<OrgManagePage | null>(null);
  const [settingsTitle, setSettingsTitle] = useState("");
  const [settingsIsPublished, setSettingsIsPublished] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<OrgManagePage | null>(null);
  const [isMutating, startMutation] = useTransition();

  useEffect(() => {
    setLocalPages(sortedPages(pages));
  }, [pages]);

  useEffect(() => {
    if (!canEditPages && isEditingMenu) {
      setIsEditingMenu(false);
    }
  }, [canEditPages, isEditingMenu]);

  const orderedPages = useMemo(() => sortedPages(localPages), [localPages]);
  const navPages = useMemo(
    () => (isEditingMenu ? orderedPages : orderedPages.filter((page) => page.isPublished)),
    [isEditingMenu, orderedPages]
  );

  function setEditorOpenForPath(path: string) {
    sessionStorage.setItem(ORG_SITE_OPEN_EDITOR_REQUEST_KEY, path);
  }

  function openPageEditor() {
    window.dispatchEvent(
      new CustomEvent(ORG_SITE_OPEN_EDITOR_EVENT, {
        detail: {
          pathname
        }
      })
    );
  }

  function navigateToEditContent(page: OrgManagePage) {
    const href = pageHref(orgSlug, page.slug);

    if (normalizePath(pathname) === normalizePath(href)) {
      openPageEditor();
      return;
    }

    setEditorOpenForPath(href);
    router.push(href);
  }

  function applyPagesResult(result: Awaited<ReturnType<typeof saveOrgPagesAction>>) {
    if (!result.ok) {
      toast({
        title: "Unable to save",
        description: result.error,
        variant: "destructive"
      });
      return null;
    }

    setLocalPages(sortedPages(result.pages));
    return result;
  }

  function reorderPages(nextPages: OrgManagePage[]) {
    if (!canEditPages || isMutating) {
      return;
    }

    const previous = orderedPages;
    const optimistic = nextPages.map((page, index) => ({ ...page, sortIndex: index }));
    setLocalPages(optimistic);

    startMutation(async () => {
      const result = await saveOrgPagesAction({
        orgSlug,
        action: {
          type: "reorder",
          pageIds: optimistic.map((page) => page.id)
        }
      });

      if (!result.ok) {
        setLocalPages(previous);
        toast({
          title: "Unable to reorder",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      setLocalPages(sortedPages(result.pages));
    });
  }

  function duplicatePage(page: OrgManagePage) {
    if (!canEditPages || isMutating) {
      return;
    }

    startMutation(async () => {
      const result = await saveOrgPagesAction({
        orgSlug,
        action: {
          type: "duplicate",
          pageId: page.id
        }
      });

      const applied = applyPagesResult(result);
      if (!applied) {
        return;
      }

      toast({
        title: "Page duplicated",
        variant: "success"
      });
    });
  }

  function togglePublish(page: OrgManagePage) {
    if (!canEditPages || isMutating) {
      return;
    }

    startMutation(async () => {
      const result = await saveOrgPagesAction({
        orgSlug,
        action: {
          type: "set-published",
          pageId: page.id,
          isPublished: !page.isPublished
        }
      });

      const applied = applyPagesResult(result);
      if (!applied) {
        return;
      }

      toast({
        title: page.isPublished ? "Page unpublished" : "Page published",
        variant: "success"
      });
    });
  }

  function deletePage() {
    if (!deleteTarget || !canEditPages || isMutating) {
      return;
    }

    startMutation(async () => {
      const result = await saveOrgPagesAction({
        orgSlug,
        action: {
          type: "delete",
          pageId: deleteTarget.id
        }
      });

      const applied = applyPagesResult(result);
      if (!applied) {
        return;
      }

      setDeleteTarget(null);
      toast({
        title: "Page deleted",
        variant: "success"
      });
    });
  }

  function savePageSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!settingsTarget || !canEditPages || isMutating) {
      return;
    }

    const nextTitle = settingsTitle.trim();
    if (!nextTitle) {
      toast({
        title: "Missing title",
        description: "Enter a page title.",
        variant: "destructive"
      });
      return;
    }

    startMutation(async () => {
      const renameResult = await saveOrgPagesAction({
        orgSlug,
        action: {
          type: "rename",
          pageId: settingsTarget.id,
          title: nextTitle
        }
      });

      const appliedRename = applyPagesResult(renameResult);
      if (!appliedRename) {
        return;
      }

      const publishResult = await saveOrgPagesAction({
        orgSlug,
        action: {
          type: "set-published",
          pageId: settingsTarget.id,
          isPublished: settingsIsPublished
        }
      });

      const applied = applyPagesResult(publishResult);
      if (!applied) {
        return;
      }

      setSettingsTarget(null);
      setSettingsTitle("");
      toast({ title: "Page settings saved", variant: "success" });
    });
  }

  function createPage(options: { openEditor: boolean }) {
    if (!canEditPages || isMutating) {
      return;
    }

    startMutation(async () => {
      const result = await saveOrgPagesAction({
        orgSlug,
        action: {
          type: "create",
          title: addPageState.title,
          slug: addPageState.slug ? sanitizePageSlug(addPageState.slug) : undefined,
          isPublished: addPageState.isPublished,
          openEditor: options.openEditor
        }
      });

      const applied = applyPagesResult(result);
      if (!applied) {
        return;
      }

      setAddPageOpen(false);
      setAddPageState({
        title: "",
        slug: "",
        isPublished: true
      });

      if (applied.createdPageSlug && options.openEditor) {
        const href = pageHref(orgSlug, applied.createdPageSlug);
        setEditorOpenForPath(href);
        router.push(href);
      }

      toast({
        title: "Page created",
        variant: "success"
      });
    });
  }

  function openSettingsDialog(page: OrgManagePage) {
    setSettingsTarget(page);
    setSettingsTitle(page.title);
    setSettingsIsPublished(page.isPublished);
  }

  function renderPageChip(page: OrgManagePage, dragMeta: SortableRenderMeta | null) {
    const href = pageHref(orgSlug, page.slug);
    const active = isActivePath(pathname, href);

    return (
      <div
        className={cn(
          "flex h-10 shrink-0 items-center gap-0.5 rounded-control border bg-surface px-1.5",
          page.isPublished ? "border-border/70" : "border-border/40 bg-surface-muted"
        )}
      >
        {dragMeta ? (
          <button
            {...dragMeta.handleProps.attributes}
            {...dragMeta.handleProps.listeners}
            aria-label="Reorder page"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-text-muted hover:bg-surface-muted"
            type="button"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        ) : null}

        <Link
          className={cn(
            "inline-flex h-8 min-w-0 max-w-[120px] items-center rounded-control px-1.5 text-sm font-medium",
            active ? "bg-surface-muted text-text" : "text-text-muted hover:bg-surface-muted hover:text-text"
          )}
          href={href}
        >
          <span className="truncate">{page.title}</span>
        </Link>

        {isEditingMenu ? (
          <div className="flex shrink-0 items-center gap-0 pl-0.5">
            <Button className="h-8 w-8 px-0" onClick={() => navigateToEditContent(page)} size="sm" variant="ghost">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button className="h-8 w-8 px-0" disabled={isMutating} loading={isMutating} onClick={() => duplicatePage(page)} size="sm" variant="ghost">
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button className="h-8 w-8 px-0" disabled={isMutating} loading={isMutating} onClick={() => togglePublish(page)} size="sm" variant="ghost">
              {page.isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
            <Button className="h-8 w-8 px-0" onClick={() => openSettingsDialog(page)} size="sm" variant="ghost">
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  const hasHeaderActions = canEditCurrentPage || canManageOrg || canEditPages;

  return (
    <>
      <div className="app-container mt-4">
        <div className="rounded-card border bg-surface shadow-floating">
          <div className="flex min-h-[64px] items-center gap-3 px-3 py-3 md:px-[18px]">
            <div className="shrink-0 self-stretch">
              <Link className="flex h-full min-w-0 items-center gap-3 leading-none" href={orgBasePath}>
                {governingBodyLogoUrl ? (
                  <>
                    <span className="flex h-7 shrink-0 items-center leading-none md:h-8">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt={`${governingBodyName ?? "Governing body"} seal`}
                        className="block h-full w-auto max-w-[44px] align-middle object-contain"
                        src={governingBodyLogoUrl}
                      />
                    </span>
                    <span aria-hidden className="h-6 w-px shrink-0 bg-border" />
                  </>
                ) : null}

                <span className="flex h-7 max-w-[220px] shrink-0 items-center leading-none md:h-8">
                  {orgLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt={`${orgName} logo`} className="block h-full w-auto max-w-full align-middle object-contain object-left" src={orgLogoUrl} />
                  ) : (
                    <span className="inline-flex h-full items-center text-sm font-semibold text-text-muted">{getOrgInitial(orgName)}</span>
                  )}
                </span>

                {!orgLogoUrl ? <span className="hidden max-w-[180px] truncate text-sm font-semibold text-text sm:inline">{orgName}</span> : null}
              </Link>
            </div>

            <nav className="hidden min-w-0 flex-1 md:block">
              {isEditingMenu ? (
                <div className="flex min-w-0 items-center justify-end gap-2 overflow-x-auto pb-1">
                  <SortableCanvas
                    className="flex w-max items-center gap-1.5"
                    getId={(page) => page.id}
                    items={navPages}
                    onReorder={reorderPages}
                    renderItem={(page, meta) => renderPageChip(page, meta)}
                    renderOverlay={(page) => renderPageChip(page, null)}
                    sortingStrategy="horizontal"
                  />
                  {canEditPages ? (
                    <Button onClick={() => setAddPageOpen(true)} size="sm" variant="secondary">
                      <Plus className="h-4 w-4" />
                      Add page
                    </Button>
                  ) : null}
                </div>
              ) : (
                <div className="flex min-w-0 items-center justify-end gap-2 overflow-x-auto pb-1">
                  {navPages.map((page) => {
                    const href = pageHref(orgSlug, page.slug);
                    return (
                      <NavItem active={isActivePath(pathname, href)} href={href} key={page.id} variant="header">
                        {page.title}
                      </NavItem>
                    );
                  })}
                </div>
              )}
            </nav>

            {hasHeaderActions ? <span aria-hidden className="hidden h-6 w-px shrink-0 bg-border md:block" /> : null}

            <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
              {canEditPages ? (
                <button className={buttonVariants({ size: "sm", variant: "secondary" })} onClick={() => setIsEditingMenu((current) => !current)} type="button">
                  <SlidersHorizontal className="h-4 w-4" />
                  {isEditingMenu ? "Done" : "Edit menu"}
                </button>
              ) : null}

              {canEditCurrentPage ? (
                <button className={buttonVariants({ size: "sm", variant: "secondary" })} onClick={openPageEditor} type="button">
                  <Pencil className="h-4 w-4" />
                  Edit page
                </button>
              ) : null}

              {canManageOrg ? (
                <Link className={buttonVariants({ size: "sm", variant: "secondary" })} href={`/${orgSlug}/manage`}>
                  <Settings className="h-4 w-4" />
                  Manage Org
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <Dialog onClose={() => setAddPageOpen(false)} open={addPageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add page</DialogTitle>
            <DialogDescription>Create a new page and add it to the menu.</DialogDescription>
          </DialogHeader>

          <form className="space-y-3">
            <FormField hint="Optional. If omitted, URL is generated from title." label="Title">
              <Input
                onChange={(event) => setAddPageState((current) => ({ ...current, title: event.target.value }))}
                placeholder="About"
                value={addPageState.title}
              />
            </FormField>

            <FormField hint="Optional. Use letters, numbers, and hyphens." label="Slug">
              <Input
                onChange={(event) => setAddPageState((current) => ({ ...current, slug: event.target.value }))}
                placeholder="about"
                value={addPageState.slug}
              />
            </FormField>

            <label className="inline-flex items-center gap-2 rounded-control border bg-surface px-3 py-2 text-sm text-text">
              <input
                checked={addPageState.isPublished}
                onChange={(event) => setAddPageState((current) => ({ ...current, isPublished: event.target.checked }))}
                type="checkbox"
              />
              Published
            </label>

            <DialogFooter>
              <Button onClick={() => setAddPageOpen(false)} type="button" variant="ghost">
                Cancel
              </Button>
              <Button disabled={isMutating} loading={isMutating} onClick={() => createPage({ openEditor: false })} type="button" variant="secondary">
                {isMutating ? "Creating..." : "Create"}
              </Button>
              <Button disabled={isMutating} loading={isMutating} onClick={() => createPage({ openEditor: true })} type="button">
                {isMutating ? "Creating..." : "Create & Edit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog onClose={() => setSettingsTarget(null)} open={Boolean(settingsTarget)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Page settings</DialogTitle>
            <DialogDescription>Update page details and visibility.</DialogDescription>
          </DialogHeader>

          <form className="space-y-3" onSubmit={savePageSettings}>
            <FormField label="Title">
              <Input onChange={(event) => setSettingsTitle(event.target.value)} value={settingsTitle} />
            </FormField>

            <label className="inline-flex items-center gap-2 rounded-control border bg-surface px-3 py-2 text-sm text-text">
              <input checked={settingsIsPublished} onChange={(event) => setSettingsIsPublished(event.target.checked)} type="checkbox" />
              Published
            </label>

            <div className="pt-2">
              <Button
                disabled={isMutating || settingsTarget?.slug === "home"}
                onClick={() => {
                  if (settingsTarget) {
                    setDeleteTarget(settingsTarget);
                    setSettingsTarget(null);
                  }
                }}
                type="button"
                variant="destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete page
              </Button>
            </div>

            <DialogFooter>
              <Button onClick={() => setSettingsTarget(null)} type="button" variant="ghost">
                Cancel
              </Button>
              <Button disabled={isMutating} loading={isMutating} type="submit">
                {isMutating ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog onClose={() => setDeleteTarget(null)} open={Boolean(deleteTarget)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete page</DialogTitle>
            <DialogDescription>
              Delete <span className="font-semibold text-text">{deleteTarget?.title}</span>? This also removes all blocks for that page.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button onClick={() => setDeleteTarget(null)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button disabled={isMutating} loading={isMutating} onClick={deletePage} type="button" variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
