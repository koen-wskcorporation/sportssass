"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { GripVertical, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { saveOrgNavItemsAction } from "@/modules/site-builder/actions";
import { type OrgNavItem } from "@/modules/site-builder/nav";
import { createLocalId, defaultInternalLink, type LinkValue } from "@/lib/links";
import { SortableCanvas, type SortableRenderMeta } from "@/components/editor/SortableCanvas";
import { LinkPickerField } from "@/components/shared/LinkPickerField";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import type { OrgManagePage } from "@/modules/site-builder/types";

type OrgNavEditorCardProps = {
  orgSlug: string;
  canWrite: boolean;
  initialItems: OrgNavItem[];
  pages: OrgManagePage[];
};

type TopDialogTarget =
  | {
      mode: "add";
    }
  | {
      mode: "edit";
      topIndex: number;
    };

type ChildDialogTarget =
  | {
      mode: "add";
      topIndex: number;
    }
  | {
      mode: "edit";
      topIndex: number;
      childIndex: number;
    };

type TopDialogValue = {
  label: string;
  kind: "link" | "menu";
  link: LinkValue;
  openInNewTab: boolean;
};

type ChildDialogValue = {
  label: string;
  link: LinkValue;
  openInNewTab: boolean;
};

function cloneItems(items: OrgNavItem[]): OrgNavItem[] {
  return items.map((item) => ({
    ...item,
    link: item.link ? { ...item.link } : null,
    children: item.children.map((child) => ({
      ...child,
      link: { ...child.link }
    }))
  }));
}

function pathForSlug(slug: string) {
  return slug === "home" ? "/" : `/${slug}`;
}

function labelForSlug(slug: string, pages: OrgManagePage[]) {
  const match = pages.find((page) => page.slug === slug);

  if (match) {
    return {
      label: match.title,
      path: pathForSlug(slug)
    };
  }

  if (slug === "home") {
    return {
      label: "Home",
      path: "/"
    };
  }

  return {
    label: slug,
    path: pathForSlug(slug)
  };
}

function describeLink(link: LinkValue | null, pages: OrgManagePage[], openInNewTab: boolean) {
  if (!link) {
    return "Menu";
  }

  if (link.type === "external") {
    return openInNewTab ? `${link.url} (opens in new tab)` : link.url;
  }

  const resolved = labelForSlug(link.pageSlug, pages);
  return `${resolved.label} (${resolved.path})`;
}

function validateNav(items: OrgNavItem[]) {
  if (items.length === 0) {
    return "Add at least one menu item.";
  }

  for (const item of items) {
    if (!item.label.trim()) {
      return "Each menu item needs a name.";
    }

    if (!item.link && item.children.length === 0) {
      return `\"${item.label}\" is a menu and needs at least one dropdown link.`;
    }

    for (const child of item.children) {
      if (!child.label.trim()) {
        return "Each dropdown link needs a name.";
      }
    }
  }

  return null;
}

function topItemCard(
  item: OrgNavItem,
  pages: OrgManagePage[],
  content: {
    children?: ReactNode;
    actions?: ReactNode;
    dragMeta?: SortableRenderMeta;
  }
) {
  return (
    <div className="rounded-control border bg-surface" key={item.id}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-3 py-3">
        <div className="flex min-w-0 items-start gap-2">
          {content.dragMeta ? (
            <button
              {...content.dragMeta.handleProps.attributes}
              {...content.dragMeta.handleProps.listeners}
              aria-label="Reorder menu item"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control border border-border/70 bg-surface text-text-muted"
              type="button"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          ) : null}

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-text">{item.label}</p>
              {!item.link ? <Badge variant="warning">Menu</Badge> : <Badge variant="neutral">Link</Badge>}
              {item.children.length > 0 ? <Badge variant="neutral">Dropdown {item.children.length}</Badge> : null}
            </div>
            <p className="text-xs text-text-muted">{describeLink(item.link, pages, item.openInNewTab)}</p>
          </div>
        </div>

        {content.actions}
      </div>

      {content.children ? <div className="border-t px-3 py-3">{content.children}</div> : null}
    </div>
  );
}

function childLinkCard(item: OrgNavItem["children"][number], pages: OrgManagePage[], dragMeta: SortableRenderMeta | null, actions: ReactNode) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-control border bg-surface-muted px-3 py-2">
      <div className="flex min-w-0 items-start gap-2">
        {dragMeta ? (
          <button
            {...dragMeta.handleProps.attributes}
            {...dragMeta.handleProps.listeners}
            aria-label="Reorder dropdown link"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-control border border-border/70 bg-surface text-text-muted"
            type="button"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : null}

        <div className="space-y-1">
          <p className="text-sm font-semibold text-text">{item.label}</p>
          <p className="text-xs text-text-muted">{describeLink(item.link, pages, item.openInNewTab)}</p>
        </div>
      </div>

      {actions}
    </div>
  );
}

export function OrgNavEditorCard({ orgSlug, canWrite, initialItems, pages }: OrgNavEditorCardProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<OrgNavItem[]>(() => cloneItems(initialItems));
  const [savedItems, setSavedItems] = useState<OrgNavItem[]>(() => cloneItems(initialItems));
  const [topDialogTarget, setTopDialogTarget] = useState<TopDialogTarget | null>(null);
  const [childDialogTarget, setChildDialogTarget] = useState<ChildDialogTarget | null>(null);
  const [isSaving, startSaving] = useTransition();

  useEffect(() => {
    const cloned = cloneItems(initialItems);
    setItems(cloned);
    setSavedItems(cloned);
  }, [initialItems]);

  const isDirty = useMemo(() => JSON.stringify(items) !== JSON.stringify(savedItems), [items, savedItems]);

  function resetDraft() {
    setItems(cloneItems(savedItems));
  }

  function saveDraft() {
    if (!canWrite || isSaving) {
      return;
    }

    const validationError = validateNav(items);

    if (validationError) {
      toast({
        title: "Navigation not saved",
        description: validationError,
        variant: "destructive"
      });
      return;
    }

    startSaving(async () => {
      const result = await saveOrgNavItemsAction({
        orgSlug,
        items
      });

      if (!result.ok) {
        toast({
          title: "Navigation save failed",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      const nextItems = cloneItems(result.items);
      setItems(nextItems);
      setSavedItems(nextItems);

      toast({
        title: "Navigation saved",
        description: "Your website menu is live.",
        variant: "success"
      });
    });
  }

  function openAddLinkDialog() {
    setTopDialogTarget({
      mode: "add"
    });
  }

  function openEditTopDialog(topIndex: number) {
    if (!items[topIndex]) {
      return;
    }

    setTopDialogTarget({
      mode: "edit",
      topIndex
    });
  }

  function openAddChildDialog(topIndex: number) {
    if (!items[topIndex]) {
      return;
    }

    setChildDialogTarget({
      mode: "add",
      topIndex
    });
  }

  function openEditChildDialog(topIndex: number, childIndex: number) {
    if (!items[topIndex]?.children[childIndex]) {
      return;
    }

    setChildDialogTarget({
      mode: "edit",
      topIndex,
      childIndex
    });
  }

  function deleteTopItem(topIndex: number) {
    setItems((current) => current.filter((_, index) => index !== topIndex));
  }

  function deleteChildItem(topIndex: number, childIndex: number) {
    setItems((current) => {
      const topItem = current[topIndex];

      if (!topItem) {
        return current;
      }

      const next = [...current];
      next[topIndex] = {
        ...topItem,
        children: topItem.children.filter((_, index) => index !== childIndex)
      };

      return next;
    });
  }

  function applyTopDialog(nextValue: TopDialogValue) {
    if (!topDialogTarget) {
      return;
    }

    if (topDialogTarget.mode === "add") {
      setItems((current) => [
        ...current,
        {
          id: createLocalId(),
          label: nextValue.label,
          link: nextValue.kind === "menu" ? null : nextValue.link,
          openInNewTab: nextValue.kind === "menu" || nextValue.link.type !== "external" ? false : nextValue.openInNewTab,
          children: []
        }
      ]);
      setTopDialogTarget(null);
      return;
    }

    setItems((current) =>
      current.map((item, index) => {
        if (index !== topDialogTarget.topIndex) {
          return item;
        }

        return {
          ...item,
          label: nextValue.label,
          link: nextValue.kind === "menu" ? null : nextValue.link,
          openInNewTab: nextValue.kind === "menu" || nextValue.link.type !== "external" ? false : nextValue.openInNewTab
        };
      })
    );

    setTopDialogTarget(null);
  }

  function applyChildDialog(nextValue: ChildDialogValue) {
    if (!childDialogTarget) {
      return;
    }

    if (childDialogTarget.mode === "add") {
      setItems((current) => {
        const topItem = current[childDialogTarget.topIndex];

        if (!topItem) {
          return current;
        }

        const next = [...current];
        next[childDialogTarget.topIndex] = {
          ...topItem,
          children: [
            ...topItem.children,
            {
              id: createLocalId(),
              label: nextValue.label,
              link: nextValue.link,
              openInNewTab: nextValue.link.type === "external" ? nextValue.openInNewTab : false
            }
          ]
        };

        return next;
      });

      setChildDialogTarget(null);
      return;
    }

    setItems((current) => {
      const topItem = current[childDialogTarget.topIndex];

      if (!topItem) {
        return current;
      }

      const childItem = topItem.children[childDialogTarget.childIndex];

      if (!childItem) {
        return current;
      }

      const next = [...current];
      const nextChildren = [...topItem.children];
      nextChildren[childDialogTarget.childIndex] = {
        ...childItem,
        label: nextValue.label,
        link: nextValue.link,
        openInNewTab: nextValue.link.type === "external" ? nextValue.openInNewTab : false
      };

      next[childDialogTarget.topIndex] = {
        ...topItem,
        children: nextChildren
      };

      return next;
    });

    setChildDialogTarget(null);
  }

  const topDialogInitial = useMemo<TopDialogValue>(() => {
    if (!topDialogTarget || topDialogTarget.mode === "add") {
      return {
        label: "New link",
        kind: "link",
        link: defaultInternalLink("home"),
        openInNewTab: false
      };
    }

    const item = items[topDialogTarget.topIndex];

    if (!item) {
      return {
        label: "New link",
        kind: "link",
        link: defaultInternalLink("home"),
        openInNewTab: false
      };
    }

    return {
      label: item.label,
      kind: item.link ? "link" : "menu",
      link: item.link ?? defaultInternalLink("home"),
      openInNewTab: item.openInNewTab
    };
  }, [items, topDialogTarget]);

  const childDialogInitial = useMemo<ChildDialogValue>(() => {
    if (!childDialogTarget || childDialogTarget.mode === "add") {
      return {
        label: "Dropdown link",
        link: defaultInternalLink("home"),
        openInNewTab: false
      };
    }

    const child = items[childDialogTarget.topIndex]?.children[childDialogTarget.childIndex];

    if (!child) {
      return {
        label: "Dropdown link",
        link: defaultInternalLink("home"),
        openInNewTab: false
      };
    }

    return {
      label: child.label,
      link: child.link,
      openInNewTab: child.openInNewTab
    };
  }, [childDialogTarget, items]);

  const overlayTopItem = (item: OrgNavItem) => topItemCard(item, pages, {});

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Top menu</CardTitle>
            <CardDescription>Build your website navigation with links and dropdown menus.</CardDescription>
          </div>

          {canWrite ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button disabled={isSaving} onClick={openAddLinkDialog} size="sm" variant="secondary">
                <Plus className="h-4 w-4" />
                Add link
              </Button>
              <Button
                disabled={isSaving}
                onClick={() => {
                  setItems((current) => [
                    ...current,
                    {
                      id: createLocalId(),
                      label: "New menu",
                      link: null,
                      openInNewTab: false,
                      children: []
                    }
                  ]);
                }}
                size="sm"
                variant="secondary"
              >
                <Plus className="h-4 w-4" />
                Add menu
              </Button>
              <Button disabled={!isDirty || isSaving} onClick={saveDraft} size="sm">
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save menu"}
              </Button>
              <Button disabled={!isDirty || isSaving} onClick={resetDraft} size="sm" variant="ghost">
                Reset
              </Button>
            </div>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {!canWrite ? <Alert variant="warning">Your role can view menu settings but cannot edit them.</Alert> : null}

        {items.length === 0 ? (
          <div className="rounded-control border border-dashed px-4 py-6 text-sm text-text-muted">No menu items yet.</div>
        ) : (
          <SortableCanvas
            className="space-y-3"
            getId={(item) => item.id}
            items={items}
            onReorder={(nextItems) => setItems(nextItems)}
            renderItem={(item, meta) => {
              const topIndex = items.findIndex((current) => current.id === item.id);

              return topItemCard(item, pages, {
                dragMeta: meta,
                actions: canWrite ? (
                  <div className="flex flex-wrap items-center gap-1">
                    <Button aria-label="Edit item" disabled={isSaving} onClick={() => openEditTopDialog(topIndex)} size="sm" variant="ghost">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button aria-label="Delete item" disabled={isSaving} onClick={() => deleteTopItem(topIndex)} size="sm" variant="ghost">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null,
                children: (
                  <div className="space-y-2">
                    {canWrite ? (
                      <Button disabled={isSaving} onClick={() => openAddChildDialog(topIndex)} size="sm" variant="secondary">
                        <Plus className="h-4 w-4" />
                        Add dropdown link
                      </Button>
                    ) : null}

                    {item.children.length > 0 ? (
                      <SortableCanvas
                        className="space-y-2"
                        getId={(child) => child.id}
                        items={item.children}
                        onReorder={(nextChildren) => {
                          setItems((current) =>
                            current.map((currentItem) => {
                              if (currentItem.id !== item.id) {
                                return currentItem;
                              }

                              return {
                                ...currentItem,
                                children: nextChildren
                              };
                            })
                          );
                        }}
                        renderItem={(child, childMeta) => {
                          const childIndex = item.children.findIndex((currentChild) => currentChild.id === child.id);

                          return childLinkCard(
                            child,
                            pages,
                            childMeta,
                            canWrite ? (
                              <div className="flex flex-wrap items-center gap-1">
                                <Button
                                  aria-label="Edit dropdown link"
                                  disabled={isSaving}
                                  onClick={() => openEditChildDialog(topIndex, childIndex)}
                                  size="sm"
                                  variant="ghost"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  aria-label="Delete dropdown link"
                                  disabled={isSaving}
                                  onClick={() => deleteChildItem(topIndex, childIndex)}
                                  size="sm"
                                  variant="ghost"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : null
                          );
                        }}
                        renderOverlay={(child) => childLinkCard(child, pages, null, null)}
                      />
                    ) : (
                      <p className="text-xs text-text-muted">No dropdown links yet.</p>
                    )}

                    {!item.link && item.children.length === 0 ? <Alert variant="destructive">Menus need at least one dropdown link.</Alert> : null}
                  </div>
                )
              });
            }}
            renderOverlay={overlayTopItem}
          />
        )}
      </CardContent>

      {topDialogTarget ? (
        <TopMenuItemDialog
          initialValue={topDialogInitial}
          onClose={() => setTopDialogTarget(null)}
          onSave={applyTopDialog}
          open
          orgSlug={orgSlug}
          title={topDialogTarget.mode === "add" ? "Add menu item" : "Edit menu item"}
        />
      ) : null}

      {childDialogTarget ? (
        <DropdownLinkDialog
          initialValue={childDialogInitial}
          onClose={() => setChildDialogTarget(null)}
          onSave={applyChildDialog}
          open
          orgSlug={orgSlug}
          title={childDialogTarget.mode === "add" ? "Add dropdown link" : "Edit dropdown link"}
        />
      ) : null}
    </Card>
  );
}

type TopMenuItemDialogProps = {
  open: boolean;
  title: string;
  orgSlug: string;
  initialValue: TopDialogValue;
  onClose: () => void;
  onSave: (value: TopDialogValue) => void;
};

function TopMenuItemDialog({ open, title, orgSlug, initialValue, onClose, onSave }: TopMenuItemDialogProps) {
  const [label, setLabel] = useState(initialValue.label);
  const [kind, setKind] = useState<"link" | "menu">(initialValue.kind);
  const [link, setLink] = useState<LinkValue>(initialValue.link);
  const [openInNewTab, setOpenInNewTab] = useState(initialValue.openInNewTab);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setLabel(initialValue.label);
    setKind(initialValue.kind);
    setLink(initialValue.link);
    setOpenInNewTab(initialValue.openInNewTab);
    setValidationError(null);
  }, [initialValue, open]);

  const isExternal = link.type === "external";

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextLabel = label.trim();

    if (!nextLabel) {
      setValidationError("Menu item name is required.");
      return;
    }

    onSave({
      label: nextLabel,
      kind,
      link,
      openInNewTab: kind === "link" && isExternal ? openInNewTab : false
    });
  }

  return (
    <Dialog onClose={onClose} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Create a link or menu for your website navigation.</DialogDescription>
        </DialogHeader>

        <form className="space-y-3" onSubmit={handleSave}>
          <FormField label="Name">
            <Input
              onChange={(event) => {
                setLabel(event.target.value);
                setValidationError(null);
              }}
              placeholder="Programs"
              value={label}
            />
          </FormField>

          <FormField label="Type">
            <Select
              onChange={(event) => {
                setKind(event.target.value as "link" | "menu");
                setValidationError(null);
              }}
              options={[
                { label: "Link", value: "link" },
                { label: "Menu", value: "menu" }
              ]}
              value={kind}
            />
          </FormField>

          {kind === "link" ? (
            <>
              <LinkPickerField
                label="Link"
                onChange={(nextLink) => {
                  setLink(nextLink);
                  if (nextLink.type !== "external") {
                    setOpenInNewTab(false);
                  }
                }}
                orgSlug={orgSlug}
                value={link}
              />

              {isExternal ? (
                <label className="inline-flex items-center gap-2 rounded-control border bg-surface px-3 py-2 text-sm text-text">
                  <input
                    checked={openInNewTab}
                    onChange={(event) => {
                      setOpenInNewTab(event.target.checked);
                    }}
                    type="checkbox"
                  />
                  Open in new tab
                </label>
              ) : null}
            </>
          ) : (
            <Alert variant="warning">Menus can hold dropdown links. Add those after saving.</Alert>
          )}

          {validationError ? <Alert variant="destructive">{validationError}</Alert> : null}

          <DialogFooter>
            <Button onClick={onClose} type="button" variant="ghost">
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type DropdownLinkDialogProps = {
  open: boolean;
  title: string;
  orgSlug: string;
  initialValue: ChildDialogValue;
  onClose: () => void;
  onSave: (value: ChildDialogValue) => void;
};

function DropdownLinkDialog({ open, title, orgSlug, initialValue, onClose, onSave }: DropdownLinkDialogProps) {
  const [label, setLabel] = useState(initialValue.label);
  const [link, setLink] = useState<LinkValue>(initialValue.link);
  const [openInNewTab, setOpenInNewTab] = useState(initialValue.openInNewTab);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setLabel(initialValue.label);
    setLink(initialValue.link);
    setOpenInNewTab(initialValue.openInNewTab);
    setValidationError(null);
  }, [initialValue, open]);

  const isExternal = link.type === "external";

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextLabel = label.trim();

    if (!nextLabel) {
      setValidationError("Dropdown link name is required.");
      return;
    }

    onSave({
      label: nextLabel,
      link,
      openInNewTab: isExternal ? openInNewTab : false
    });
  }

  return (
    <Dialog onClose={onClose} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Add a page link or external website to this dropdown menu.</DialogDescription>
        </DialogHeader>

        <form className="space-y-3" onSubmit={handleSave}>
          <FormField label="Name">
            <Input
              onChange={(event) => {
                setLabel(event.target.value);
                setValidationError(null);
              }}
              placeholder="Team store"
              value={label}
            />
          </FormField>

          <LinkPickerField
            label="Link"
            onChange={(nextLink) => {
              setLink(nextLink);
              if (nextLink.type !== "external") {
                setOpenInNewTab(false);
              }
            }}
            orgSlug={orgSlug}
            value={link}
          />

          {isExternal ? (
            <label className="inline-flex items-center gap-2 rounded-control border bg-surface px-3 py-2 text-sm text-text">
              <input
                checked={openInNewTab}
                onChange={(event) => {
                  setOpenInNewTab(event.target.checked);
                }}
                type="checkbox"
              />
              Open in new tab
            </label>
          ) : null}

          {validationError ? <Alert variant="destructive">{validationError}</Alert> : null}

          <DialogFooter>
            <Button onClick={onClose} type="button" variant="ghost">
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
