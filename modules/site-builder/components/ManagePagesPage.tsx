"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { Copy, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createManagedPageAction,
  deleteManagedPageAction,
  duplicateManagedPageAction,
  reorderManagedPagesAction,
  savePageSettingsAction
} from "@/modules/site-builder/actions";
import { SortableCanvas, type SortableRenderMeta } from "@/components/editor/SortableCanvas";
import { OrgNavEditorCard } from "@/modules/site-builder/components/OrgNavEditor";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { sanitizePageSlug } from "@/modules/site-builder/blocks/helpers";
import type { OrgNavItem } from "@/modules/site-builder/nav";
import type { OrgManagePage } from "@/modules/site-builder/types";

type ManagePagesPageProps = {
  orgSlug: string;
  pages: OrgManagePage[];
  navItems: OrgNavItem[];
  canWrite: boolean;
};

type PageSettingsState =
  | {
      mode: "create";
      title: string;
      slug: string;
      isPublished: boolean;
    }
  | {
      mode: "edit";
      pageId: string;
      title: string;
      slug: string;
      isPublished: boolean;
    };

function pageHref(orgSlug: string, pageSlug: string) {
  return pageSlug === "home" ? `/${orgSlug}` : `/${orgSlug}/${pageSlug}`;
}

function sitePath(pageSlug: string) {
  return pageSlug === "home" ? "/" : `/${pageSlug}`;
}

function normalizePreviewSlug(slug: string) {
  const normalized = sanitizePageSlug(slug);
  return normalized === "home" ? "/" : `/${normalized}`;
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function pageRow(
  page: OrgManagePage,
  orgSlug: string,
  canWrite: boolean,
  dragMeta: SortableRenderMeta | null,
  actions: ReactNode
) {
  const href = pageHref(orgSlug, page.slug);

  return (
    <div className="rounded-control border bg-surface px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          {canWrite && dragMeta ? (
            <button
              {...dragMeta.handleProps.attributes}
              {...dragMeta.handleProps.listeners}
              aria-label="Reorder page"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control border border-border/70 bg-surface text-text-muted"
              type="button"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          ) : null}

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-text">{page.title}</p>
              {page.slug === "home" ? <Badge variant="neutral">Home</Badge> : null}
              {page.isPublished ? <Badge variant="success">Published</Badge> : <Badge variant="warning">Draft</Badge>}
            </div>

            <p className="text-xs text-text-muted">{sitePath(page.slug)}</p>
            <p className="text-xs text-text-muted">Updated {formatUpdatedAt(page.updatedAt)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link className={buttonVariants({ size: "sm", variant: "ghost" })} href={href}>
            View
          </Link>
          {canWrite ? (
            <Link className={buttonVariants({ size: "sm", variant: "secondary" })} href={`${href}?edit=1`}>
              Edit content
            </Link>
          ) : null}
          {canWrite ? actions : null}
        </div>
      </div>
    </div>
  );
}

export function ManagePagesPage({ orgSlug, pages, navItems, canWrite }: ManagePagesPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [draftPages, setDraftPages] = useState<OrgManagePage[]>(pages);
  const [settingsState, setSettingsState] = useState<PageSettingsState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrgManagePage | null>(null);
  const [topMenuDialogOpen, setTopMenuDialogOpen] = useState(false);
  const [isMutating, startMutation] = useTransition();
  const shouldOpenTopMenuDialog = searchParams.get("menu") === "1";

  useEffect(() => {
    setDraftPages(pages);
  }, [pages]);

  useEffect(() => {
    if (!shouldOpenTopMenuDialog) {
      return;
    }

    setTopMenuDialogOpen(true);
  }, [shouldOpenTopMenuDialog]);

  const sortedPages = useMemo(() => [...draftPages].sort((a, b) => a.sortIndex - b.sortIndex), [draftPages]);

  function closeTopMenuDialog() {
    setTopMenuDialogOpen(false);

    if (!shouldOpenTopMenuDialog) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("menu");

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }

  function applyPagesResult(
    result: { ok: true; pages: OrgManagePage[] } | { ok: false; error: string },
    options?: {
      successTitle?: string;
      successDescription?: string;
    }
  ) {
    if (!result.ok) {
      toast({
        title: "Unable to save",
        description: result.error,
        variant: "destructive"
      });
      return false;
    }

    setDraftPages(result.pages);

    if (options?.successTitle) {
      toast({
        title: options.successTitle,
        description: options.successDescription,
        variant: "success"
      });
    }

    return true;
  }

  function openCreateDialog() {
    setSettingsState({
      mode: "create",
      title: "",
      slug: "",
      isPublished: true
    });
  }

  function openEditDialog(page: OrgManagePage) {
    setSettingsState({
      mode: "edit",
      pageId: page.id,
      title: page.title,
      slug: page.slug,
      isPublished: page.isPublished
    });
  }

  function saveSettings(nextState: PageSettingsState) {
    if (!canWrite || isMutating) {
      return;
    }

    startMutation(async () => {
      if (nextState.mode === "create") {
        const result = await createManagedPageAction({
          orgSlug,
          title: nextState.title,
          pageSlug: nextState.slug,
          isPublished: nextState.isPublished
        });

        const success = applyPagesResult(result, {
          successTitle: "Page created",
          successDescription: "Your new page is ready."
        });

        if (success) {
          setSettingsState(null);
        }

        return;
      }

      const result = await savePageSettingsAction({
        orgSlug,
        pageId: nextState.pageId,
        title: nextState.title,
        pageSlug: nextState.slug,
        isPublished: nextState.isPublished
      });

      const success = applyPagesResult(result, {
        successTitle: "Page updated",
        successDescription: "Page settings have been saved."
      });

      if (success) {
        setSettingsState(null);
      }
    });
  }

  function togglePublish(page: OrgManagePage) {
    if (!canWrite || isMutating) {
      return;
    }

    startMutation(async () => {
      const result = await savePageSettingsAction({
        orgSlug,
        pageId: page.id,
        title: page.title,
        pageSlug: page.slug,
        isPublished: !page.isPublished
      });

      applyPagesResult(result, {
        successTitle: page.isPublished ? "Page moved to draft" : "Page published"
      });
    });
  }

  function duplicatePage(page: OrgManagePage) {
    if (!canWrite || isMutating) {
      return;
    }

    startMutation(async () => {
      const result = await duplicateManagedPageAction({
        orgSlug,
        pageId: page.id
      });

      applyPagesResult(result, {
        successTitle: "Page duplicated"
      });
    });
  }

  function deletePage() {
    if (!canWrite || isMutating || !deleteTarget) {
      return;
    }

    startMutation(async () => {
      const result = await deleteManagedPageAction({
        orgSlug,
        pageId: deleteTarget.id
      });

      const success = applyPagesResult(result, {
        successTitle: "Page deleted"
      });

      if (success) {
        setDeleteTarget(null);
      }
    });
  }

  function reorderPages(nextPages: OrgManagePage[]) {
    if (!canWrite || isMutating) {
      return;
    }

    const previousPages = sortedPages;
    setDraftPages(nextPages.map((page, index) => ({ ...page, sortIndex: index })));

    startMutation(async () => {
      const result = await reorderManagedPagesAction({
        orgSlug,
        pageIds: nextPages.map((page) => page.id)
      });

      if (!result.ok) {
        setDraftPages(previousPages);
        toast({
          title: "Unable to reorder",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      setDraftPages(result.pages);
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setTopMenuDialogOpen(true)} type="button" variant="secondary">
              Top menu
            </Button>
            {canWrite ? (
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4" />
                New page
              </Button>
            ) : null}
          </div>
        }
        description="Manage all pages and your top navigation in one place."
        title="Pages"
      />

      {!canWrite ? <Alert variant="warning">Your role can view pages but cannot edit them.</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>All pages</CardTitle>
          <CardDescription>Reorder pages, edit settings, and publish updates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedPages.length === 0 ? (
            <div className="rounded-control border border-dashed px-4 py-6 text-sm text-text-muted">No pages yet.</div>
          ) : !canWrite ? (
            <div className="space-y-3">
              {sortedPages.map((page) => pageRow(page, orgSlug, canWrite, null, null))}
            </div>
          ) : (
            <SortableCanvas
              className="space-y-3"
              getId={(page) => page.id}
              items={sortedPages}
              onReorder={reorderPages}
              renderItem={(page, meta) =>
                pageRow(
                  page,
                  orgSlug,
                  canWrite,
                  meta,
                  <>
                    <Button disabled={isMutating} onClick={() => openEditDialog(page)} size="sm" variant="ghost">
                      <Pencil className="h-4 w-4" />
                      Settings
                    </Button>
                    <Button disabled={isMutating} onClick={() => togglePublish(page)} size="sm" variant="ghost">
                      {page.isPublished ? "Unpublish" : "Publish"}
                    </Button>
                    <Button disabled={isMutating} onClick={() => duplicatePage(page)} size="sm" variant="ghost">
                      <Copy className="h-4 w-4" />
                      Duplicate
                    </Button>
                    <Button disabled={isMutating || page.slug === "home"} onClick={() => setDeleteTarget(page)} size="sm" variant="ghost">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </>
                )
              }
              renderOverlay={(page) => pageRow(page, orgSlug, canWrite, null, null)}
            />
          )}
        </CardContent>
      </Card>

      <Dialog onClose={closeTopMenuDialog} open={topMenuDialogOpen}>
        <DialogContent className="w-[min(72rem,calc(100vw-1rem))]">
          <OrgNavEditorCard canWrite={canWrite} initialItems={navItems} orgSlug={orgSlug} pages={sortedPages} />
          <DialogFooter>
            <Button onClick={closeTopMenuDialog} type="button" variant="ghost">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {settingsState ? (
        <PageSettingsDialog
          isSaving={isMutating}
          onClose={() => setSettingsState(null)}
          onSave={saveSettings}
          open
          value={settingsState}
        />
      ) : null}

      {deleteTarget ? (
        <Dialog onClose={() => setDeleteTarget(null)} open>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete page</DialogTitle>
              <DialogDescription>
                Delete <span className="font-semibold text-text">{deleteTarget.title}</span>? This removes the page and all of its blocks.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button onClick={() => setDeleteTarget(null)} type="button" variant="ghost">
                Cancel
              </Button>
              <Button onClick={deletePage} type="button" variant="destructive">
                Delete page
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

type PageSettingsDialogProps = {
  open: boolean;
  value: PageSettingsState;
  isSaving: boolean;
  onClose: () => void;
  onSave: (value: PageSettingsState) => void;
};

function PageSettingsDialog({ open, value, isSaving, onClose, onSave }: PageSettingsDialogProps) {
  const [draft, setDraft] = useState<PageSettingsState>(value);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraft(value);
    setError(null);
  }, [open, value]);

  const isHome = draft.mode === "edit" && draft.slug === "home";
  const previewPath = isHome ? "/" : normalizePreviewSlug(draft.slug);

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextTitle = draft.title.trim();
    const nextSlug = sanitizePageSlug(draft.slug);

    if (!nextTitle) {
      setError("Page name is required.");
      return;
    }

    if (!nextSlug) {
      setError("Page URL is required.");
      return;
    }

    onSave({
      ...draft,
      title: nextTitle,
      slug: nextSlug
    });
  }

  return (
    <Dialog onClose={onClose} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{draft.mode === "create" ? "New page" : "Page settings"}</DialogTitle>
          <DialogDescription>Edit the page name, URL, and publish status.</DialogDescription>
        </DialogHeader>

        <form className="space-y-3" onSubmit={handleSave}>
          <FormField label="Page name">
            <Input
              onChange={(event) => {
                setDraft((current) => ({
                  ...current,
                  title: event.target.value
                }));
                setError(null);
              }}
              placeholder="About"
              value={draft.title}
            />
          </FormField>

          <FormField label="Page URL">
            <Input
              disabled={isHome}
              onChange={(event) => {
                setDraft((current) => ({
                  ...current,
                  slug: event.target.value
                }));
                setError(null);
              }}
              placeholder="about"
              value={draft.slug}
            />
            <p className="text-xs text-text-muted">Your page will be at: {previewPath}</p>
          </FormField>

          <label className="inline-flex items-center gap-2 rounded-control border bg-surface px-3 py-2 text-sm text-text">
            <input
              checked={draft.isPublished}
              onChange={(event) => {
                const checked = event.target.checked;
                setDraft((current) => ({
                  ...current,
                  isPublished: checked
                }));
              }}
              type="checkbox"
            />
            Published
          </label>

          {error ? <Alert variant="destructive">{error}</Alert> : null}

          <DialogFooter>
            <Button disabled={isSaving} onClick={onClose} type="button" variant="ghost">
              Cancel
            </Button>
            <Button disabled={isSaving} type="submit">
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
