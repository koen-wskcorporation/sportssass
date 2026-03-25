"use client";

import { Plus } from "lucide-react";
import { useMemo, useRef, useState, useTransition, type MouseEvent as ReactMouseEvent } from "react";
import { StructureCanvas } from "@/src/features/core/structure/components/StructureCanvas";
import { StructureNode } from "@/src/features/core/structure/components/StructureNode";
import { Button } from "@orgframe/ui/primitives/button";
import { Checkbox } from "@orgframe/ui/primitives/checkbox";
import { FormField } from "@orgframe/ui/primitives/form-field";
import { Input } from "@orgframe/ui/primitives/input";
import { Panel } from "@orgframe/ui/primitives/panel";
import { Popup } from "@orgframe/ui/primitives/popup";
import { Select } from "@orgframe/ui/primitives/select";
import { useConfirmDialog } from "@orgframe/ui/primitives/confirm-dialog";
import type { CanvasViewportHandle } from "@orgframe/ui/primitives/canvas-viewport";
import type { OrgManagePage, OrgSiteStructureItem, ResolvedOrgSiteStructureItemNode } from "@/src/features/site/types";

type SiteStructureSaveAction =
  | {
      type: "create-item";
      parentId?: string | null;
      itemType: "page" | "placeholder" | "dynamic";
      title: string;
      slug: string;
      urlPath: string;
      description?: string | null;
      icon?: string | null;
      showInMenu?: boolean;
      isPublished?: boolean;
      openInNewTab?: boolean;
      dynamicConfigJson?: Record<string, unknown>;
      linkTargetJson?: Record<string, unknown>;
      flagsJson?: Record<string, unknown>;
    }
  | {
      type: "update-item";
      itemId: string;
      title?: string;
      itemType?: "page" | "placeholder" | "dynamic";
      slug?: string;
      urlPath?: string;
      description?: string | null;
      icon?: string | null;
      showInMenu?: boolean;
      isPublished?: boolean;
      openInNewTab?: boolean;
      dynamicConfigJson?: Record<string, unknown>;
      linkTargetJson?: Record<string, unknown>;
      flagsJson?: Record<string, unknown>;
      parentId?: string | null;
    }
  | {
      type: "delete-item";
      itemId: string;
    }
  | {
      type: "move-item";
      dragId: string;
      targetId: string | null;
      position: "before" | "after" | "inside";
    }
  | {
      type: "batch-delete";
      itemIds: string[];
    }
  | {
      type: "batch-set-menu";
      itemIds: string[];
      showInMenu: boolean;
    };

type SiteStructureEditorPopupProps = {
  open: boolean;
  onClose: () => void;
  orgSlug: string;
  pages: OrgManagePage[];
  nodes: OrgSiteStructureItem[];
  resolved: ResolvedOrgSiteStructureItemNode[];
  onSave: (action: SiteStructureSaveAction) => Promise<void>;
  onOpenPageEditor: (pageSlug: string) => void;
};

type EditorDraft = {
  title: string;
  itemType: "page" | "placeholder" | "dynamic";
  slug: string;
  urlPath: string;
  description: string;
  icon: string;
  showInMenu: boolean;
  isPublished: boolean;
  openInNewTab: boolean;
  linkKind: "page" | "external" | "dynamic" | "none";
  linkPageSlug: string;
  linkExternalUrl: string;
  dynamicSourceType: "programs" | "forms" | "events";
  dynamicHierarchyMode: "programs_only" | "programs_divisions" | "programs_divisions_teams" | "teams_by_division";
  includeEmptyGroups: boolean;
  showGeneratedChildrenInMenu: boolean;
};

type VisibleRow = {
  node: ResolvedOrgSiteStructureItemNode;
  depth: number;
};

const NODE_WIDTH = 320;
const NODE_HEIGHT = 96;
const ROW_GAP = 20;
const INDENT = 68;
const PAD_X = 32;
const PAD_Y = 28;
const SITE_NODE_POLYGON = [
  { x: 0.03, y: 0.1 },
  { x: 0.97, y: 0.1 },
  { x: 0.99, y: 0.24 },
  { x: 0.99, y: 0.76 },
  { x: 0.97, y: 0.9 },
  { x: 0.03, y: 0.9 },
  { x: 0.01, y: 0.76 },
  { x: 0.01, y: 0.24 }
];

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "item"
  );
}

function ensureLeadingSlash(path: string) {
  if (!path.trim()) {
    return "/";
  }
  if (/^https?:\/\//i.test(path.trim())) {
    return path.trim();
  }
  const next = path.trim().startsWith("/") ? path.trim() : `/${path.trim()}`;
  return next.replace(/\/+/g, "/");
}

function buildDraft(item: OrgSiteStructureItem | null): EditorDraft {
  if (!item) {
    return {
      title: "",
      itemType: "page",
      slug: "new-page",
      urlPath: "/new-page",
      description: "",
      icon: "",
      showInMenu: true,
      isPublished: true,
      openInNewTab: false,
      linkKind: "page",
      linkPageSlug: "home",
      linkExternalUrl: "",
      dynamicSourceType: "programs",
      dynamicHierarchyMode: "programs_divisions_teams",
      includeEmptyGroups: true,
      showGeneratedChildrenInMenu: true
    };
  }

  const linkTarget = item.linkTargetJson ?? {};
  const dynamicConfig = item.dynamicConfigJson ?? {};
  const linkKind =
    linkTarget.kind === "page" || linkTarget.kind === "external" || linkTarget.kind === "dynamic" || linkTarget.kind === "none"
      ? linkTarget.kind
      : item.type === "placeholder"
        ? "none"
        : item.type === "dynamic"
          ? "dynamic"
          : "page";

  return {
    title: item.title,
    itemType: item.type,
    slug: item.slug,
    urlPath: item.urlPath,
    description: item.description ?? "",
    icon: item.icon ?? "",
    showInMenu: item.showInMenu,
    isPublished: item.isPublished,
    openInNewTab: item.openInNewTab,
    linkKind,
    linkPageSlug: typeof linkTarget.pageSlug === "string" ? linkTarget.pageSlug : "home",
    linkExternalUrl: typeof linkTarget.url === "string" ? linkTarget.url : "",
    dynamicSourceType: dynamicConfig.sourceType === "forms" || dynamicConfig.sourceType === "events" ? dynamicConfig.sourceType : "programs",
    dynamicHierarchyMode:
      dynamicConfig.hierarchyMode === "programs_only" ||
      dynamicConfig.hierarchyMode === "programs_divisions" ||
      dynamicConfig.hierarchyMode === "teams_by_division"
        ? dynamicConfig.hierarchyMode
        : "programs_divisions_teams",
    includeEmptyGroups: dynamicConfig.includeEmptyGroups !== false,
    showGeneratedChildrenInMenu: dynamicConfig.showGeneratedChildrenInMenu !== false
  };
}

function filterTree(nodes: ResolvedOrgSiteStructureItemNode[], query: string): ResolvedOrgSiteStructureItemNode[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return nodes;
  }

  const walk = (node: ResolvedOrgSiteStructureItemNode): ResolvedOrgSiteStructureItemNode | null => {
    const children = node.children
      .map((child) => walk(child))
      .filter((entry): entry is ResolvedOrgSiteStructureItemNode => Boolean(entry));
    const hit = node.title.toLowerCase().includes(q);
    if (!hit && children.length === 0) {
      return null;
    }
    return {
      ...node,
      children
    };
  };

  return nodes.map((node) => walk(node)).filter((entry): entry is ResolvedOrgSiteStructureItemNode => Boolean(entry));
}

function flattenVisible(nodes: ResolvedOrgSiteStructureItemNode[], depth = 0): VisibleRow[] {
  const rows: VisibleRow[] = [];
  for (const node of nodes) {
    rows.push({ node, depth });
    rows.push(...flattenVisible(node.children, depth + 1));
  }
  return rows;
}

export function SiteStructureEditorPopup({ open, onClose, orgSlug, pages, nodes, resolved, onSave, onOpenPageEditor }: SiteStructureEditorPopupProps) {
  const { confirm } = useConfirmDialog();
  const canvasRef = useRef<CanvasViewportHandle | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [panelMode, setPanelMode] = useState<"none" | "create" | "edit">("none");
  const [draft, setDraft] = useState<EditorDraft>(() => buildDraft(null));
  const [zoomPercent, setZoomPercent] = useState(100);

  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const filtered = useMemo(() => filterTree(resolved, search), [resolved, search]);
  const rows = useMemo(() => flattenVisible(filtered), [filtered]);

  const selectedPrimaryId = selectedIds[0] ?? null;
  const selectedPrimary = selectedPrimaryId ? byId.get(selectedPrimaryId) ?? null : null;

  const pageOptions = useMemo(
    () => pages.map((page) => ({ value: page.slug, label: `${page.title} (${page.slug === "home" ? "/" : `/${page.slug}`})` })),
    [pages]
  );

  function handleSelect(nodeId: string, event: ReactMouseEvent<HTMLDivElement>) {
    if (event.metaKey || event.ctrlKey) {
      setSelectedIds((current) => (current.includes(nodeId) ? current.filter((id) => id !== nodeId) : [...current, nodeId]));
      return;
    }
    setSelectedIds([nodeId]);
  }

  function openCreate(parentId?: string | null) {
    setPanelMode("create");
    setDraft(buildDraft(null));
    setSelectedIds(parentId ? [parentId] : []);
  }

  function openEdit(nodeId: string) {
    const node = byId.get(nodeId);
    if (!node) {
      return;
    }
    setSelectedIds([nodeId]);
    setDraft(buildDraft(node));
    setPanelMode("edit");
  }

  async function removeItems(itemIds: string[]) {
    const confirmed = await confirm({
      title: itemIds.length > 1 ? "Delete selected items?" : "Delete item?",
      description:
        itemIds.length > 1
          ? `This will delete ${itemIds.length} selected manual items and nested descendants.`
          : "This will delete the selected item and nested descendants.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive"
    });
    if (!confirmed) {
      return;
    }

    startSaving(async () => {
      if (itemIds.length === 1) {
        await onSave({ type: "delete-item", itemId: itemIds[0] });
      } else {
        await onSave({ type: "batch-delete", itemIds });
      }
      setSelectedIds([]);
      setPanelMode("none");
    });
  }

  function saveCreate() {
    const parentId = selectedIds.length === 1 ? selectedIds[0] : null;
    startSaving(async () => {
      await onSave({
        type: "create-item",
        parentId,
        itemType: draft.itemType,
        title: draft.title.trim(),
        slug: slugify(draft.slug || draft.title),
        urlPath: ensureLeadingSlash(draft.urlPath || draft.slug || draft.title),
        description: draft.description.trim() || null,
        icon: draft.icon.trim() || null,
        showInMenu: draft.showInMenu,
        isPublished: draft.isPublished,
        openInNewTab: draft.openInNewTab,
        dynamicConfigJson:
          draft.itemType === "dynamic"
            ? {
                sourceType: draft.dynamicSourceType,
                hierarchyMode: draft.dynamicHierarchyMode,
                includeEmptyGroups: draft.includeEmptyGroups,
                showGeneratedChildrenInMenu: draft.showGeneratedChildrenInMenu
              }
            : {},
        linkTargetJson:
          draft.linkKind === "page"
            ? { kind: "page", pageSlug: draft.linkPageSlug || "home" }
            : draft.linkKind === "external"
              ? { kind: "external", url: draft.linkExternalUrl }
              : draft.linkKind === "dynamic"
                ? { kind: "dynamic" }
                : { kind: "none" },
        flagsJson: {}
      });
      setPanelMode("none");
      setDraft(buildDraft(null));
    });
  }

  function saveUpdate() {
    if (!selectedPrimary) {
      return;
    }
    startSaving(async () => {
      await onSave({
        type: "update-item",
        itemId: selectedPrimary.id,
        itemType: draft.itemType,
        title: draft.title.trim(),
        slug: slugify(draft.slug || draft.title),
        urlPath: ensureLeadingSlash(draft.urlPath || draft.slug || draft.title),
        description: draft.description.trim() || null,
        icon: draft.icon.trim() || null,
        showInMenu: draft.showInMenu,
        isPublished: draft.isPublished,
        openInNewTab: draft.openInNewTab,
        dynamicConfigJson:
          draft.itemType === "dynamic"
            ? {
                sourceType: draft.dynamicSourceType,
                hierarchyMode: draft.dynamicHierarchyMode,
                includeEmptyGroups: draft.includeEmptyGroups,
                showGeneratedChildrenInMenu: draft.showGeneratedChildrenInMenu
              }
            : {},
        linkTargetJson:
          draft.linkKind === "page"
            ? { kind: "page", pageSlug: draft.linkPageSlug || "home" }
            : draft.linkKind === "external"
              ? { kind: "external", url: draft.linkExternalUrl }
              : draft.linkKind === "dynamic"
                ? { kind: "dynamic" }
                : { kind: "none" }
      });
    });
  }

  return (
    <Popup
      closeOnBackdrop={false}
      contentClassName="overflow-hidden p-0"
      onClose={onClose}
      open={open}
      popupClassName="bg-surface"
      size="full"
      subtitle="Site structure map rebuilt from scratch on the shared canvas and node system."
      title="Site Structure"
    >
      <div
        className="grid h-full w-full items-stretch transition-[grid-template-columns,column-gap] duration-200 ease-out motion-reduce:transition-none"
        data-popup-editor-root="true"
        style={{
          gridTemplateColumns: "minmax(0, 1fr) var(--popup-panel-active-width, 0px)",
          columnGap: "var(--popup-panel-gap, 0px)"
        }}
      >
        <div className="min-w-0 overflow-hidden bg-surface">
          <StructureCanvas
            addButtonAriaLabel="Add item"
            addButtonDisabled={isSaving}
            autoFitOnOpen
            canvasContentClassName="p-0"
            canvasGridColor="hsl(var(--border) / 0.55)"
            canvasGridSize={25}
            canvasLayoutMode="free"
            canvasRef={canvasRef}
            embeddedEditMode
            editContent={
              <>
                {rows.map((row, index) => {
                  const { node, depth } = row;
                  const top = PAD_Y + index * (NODE_HEIGHT + ROW_GAP);
                  const left = PAD_X + depth * INDENT;
                  const subtitle = typeof node.metaJson.urlPath === "string" ? node.metaJson.urlPath : node.reasonDisabled ?? (node.href || node.itemType);
                  const isSelected = selectedIds.includes(node.id);
                  return (
                    <StructureNode
                      capabilityMode="static"
                      key={node.id}
                      className={isSelected ? "border-accent bg-accent/10" : ""}
                      movementLocked
                      nodeId={node.id}
                      onClick={(event) => handleSelect(node.id, event)}
                      onDoubleClick={() => openEdit(node.id)}
                      polygonPoints={SITE_NODE_POLYGON}
                      quickActions={
                        node.isGenerated
                          ? undefined
                          : {
                              onEdit: () => openEdit(node.id),
                              onDelete: () => void removeItems([node.id]),
                              canDelete: true,
                              canEdit: true
                            }
                      }
                      shape="polygon"
                      structural={node.isGenerated}
                      style={{
                        position: "absolute",
                        left: `${left}px`,
                        top: `${top}px`,
                        width: `${NODE_WIDTH}px`
                      }}
                      subtitle={subtitle}
                      title={node.title}
                    />
                  );
                })}
                <StructureNode
                  appearance="drop"
                  capabilityMode="static"
                  disableQuickActionsTrigger
                  movementLocked
                  nodeId="site-structure-end-cap"
                  polygonPoints={SITE_NODE_POLYGON}
                  shape="polygon"
                  style={{
                    position: "absolute",
                    left: `${PAD_X}px`,
                    top: `${PAD_Y + rows.length * (NODE_HEIGHT + ROW_GAP)}px`,
                    width: `${NODE_WIDTH}px`,
                    height: "20px"
                  }}
                  subtitle="End"
                  title=" "
                />
              </>
            }
            onAdd={() => openCreate(selectedPrimaryId)}
            onSearchQueryChange={setSearch}
            onSearchSubmit={() => {}}
            onViewScaleChange={(scale) => setZoomPercent(Math.round(scale * 100))}
            rootHeader={
              <StructureNode
                capabilityMode="static"
                chips={<span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Public Site</span>}
                movementLocked
                nodeId="site-structure-root-header"
                polygonPoints={SITE_NODE_POLYGON}
                shape="polygon"
                title={`/${orgSlug}`}
              />
            }
            searchPlaceholder="Search structure"
            searchQuery={search}
            searchResults={rows.map((row) => ({ id: row.node.id, name: row.node.title, kindLabel: row.node.itemType }))}
            storageKey={`site-structure-v4-canvas:${orgSlug}`}
            viewContentInteractive
            viewEditButtonPlacement="top-right"
            viewViewportInteractive
            zoomPercent={zoomPercent}
          />
        </div>
        <div className="relative h-full" data-panel-context="popup" id="popup-panel-dock" />
      </div>

      <Panel
        onClose={() => {
          setPanelMode("none");
          setDraft(buildDraft(null));
        }}
        open={panelMode !== "none"}
        subtitle={panelMode === "create" ? "Create a site structure item." : "Edit selected site structure item."}
        title={panelMode === "create" ? "Create item" : "Edit item"}
      >
        <div className="space-y-3">
          <FormField label="Title">
            <Input
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  title: event.target.value,
                  slug: current.slug === slugify(current.title) || !current.slug ? slugify(event.target.value) : current.slug
                }))
              }
              value={draft.title}
            />
          </FormField>

          <FormField label="Item type">
            <Select
              onChange={(event) => setDraft((current) => ({ ...current, itemType: event.target.value as EditorDraft["itemType"] }))}
              options={[
                { value: "page", label: "Page" },
                { value: "placeholder", label: "Dropdown placeholder" },
                { value: "dynamic", label: "Dynamic group" }
              ]}
              value={draft.itemType}
            />
          </FormField>

          <FormField label="Slug">
            <Input onChange={(event) => setDraft((current) => ({ ...current, slug: slugify(event.target.value) }))} value={draft.slug} />
          </FormField>

          <FormField label="URL Path">
            <Input onChange={(event) => setDraft((current) => ({ ...current, urlPath: event.target.value }))} value={draft.urlPath} />
          </FormField>

          <FormField label="Description">
            <Input onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} value={draft.description} />
          </FormField>

          <FormField label="Icon">
            <Input onChange={(event) => setDraft((current) => ({ ...current, icon: event.target.value }))} value={draft.icon} />
          </FormField>

          {draft.itemType !== "placeholder" ? (
            <>
              <FormField label="Link target">
                <Select
                  onChange={(event) => setDraft((current) => ({ ...current, linkKind: event.target.value as EditorDraft["linkKind"] }))}
                  options={[
                    { value: "page", label: "Org page" },
                    { value: "external", label: "External URL" },
                    { value: "dynamic", label: "Dynamic route" },
                    { value: "none", label: "No link" }
                  ]}
                  value={draft.linkKind}
                />
              </FormField>
              {draft.linkKind === "page" ? (
                <FormField label="Page target">
                  <Select onChange={(event) => setDraft((current) => ({ ...current, linkPageSlug: event.target.value }))} options={pageOptions} value={draft.linkPageSlug} />
                </FormField>
              ) : null}
              {draft.linkKind === "external" ? (
                <FormField label="External URL">
                  <Input onChange={(event) => setDraft((current) => ({ ...current, linkExternalUrl: event.target.value }))} value={draft.linkExternalUrl} />
                </FormField>
              ) : null}
            </>
          ) : null}

          {draft.itemType === "dynamic" ? (
            <>
              <FormField label="Dynamic source">
                <Select
                  onChange={(event) => setDraft((current) => ({ ...current, dynamicSourceType: event.target.value as EditorDraft["dynamicSourceType"] }))}
                  options={[
                    { value: "programs", label: "Programs" },
                    { value: "forms", label: "Forms" },
                    { value: "events", label: "Events" }
                  ]}
                  value={draft.dynamicSourceType}
                />
              </FormField>
              {draft.dynamicSourceType === "programs" ? (
                <FormField label="Hierarchy mode">
                  <Select
                    onChange={(event) => setDraft((current) => ({ ...current, dynamicHierarchyMode: event.target.value as EditorDraft["dynamicHierarchyMode"] }))}
                    options={[
                      { value: "programs_only", label: "Programs only" },
                      { value: "programs_divisions", label: "Programs > Divisions" },
                      { value: "programs_divisions_teams", label: "Programs > Divisions > Teams" },
                      { value: "teams_by_division", label: "Teams grouped by division" }
                    ]}
                    value={draft.dynamicHierarchyMode}
                  />
                </FormField>
              ) : null}
              <label className="inline-flex items-center gap-2 rounded-control border bg-surface px-3 py-2 text-sm">
                <Checkbox checked={draft.includeEmptyGroups} onChange={(event) => setDraft((current) => ({ ...current, includeEmptyGroups: event.target.checked }))} />
                Include empty generated groups
              </label>
              <label className="inline-flex items-center gap-2 rounded-control border bg-surface px-3 py-2 text-sm">
                <Checkbox
                  checked={draft.showGeneratedChildrenInMenu}
                  onChange={(event) => setDraft((current) => ({ ...current, showGeneratedChildrenInMenu: event.target.checked }))}
                />
                Show generated descendants in menu
              </label>
            </>
          ) : null}

          <label className="inline-flex items-center gap-2 rounded-control border bg-surface px-3 py-2 text-sm">
            <Checkbox checked={draft.showInMenu} onChange={(event) => setDraft((current) => ({ ...current, showInMenu: event.target.checked }))} />
            Show in menu
          </label>

          <label className="inline-flex items-center gap-2 rounded-control border bg-surface px-3 py-2 text-sm">
            <Checkbox checked={draft.isPublished} onChange={(event) => setDraft((current) => ({ ...current, isPublished: event.target.checked }))} />
            Published
          </label>

          <label className="inline-flex items-center gap-2 rounded-control border bg-surface px-3 py-2 text-sm">
            <Checkbox checked={draft.openInNewTab} onChange={(event) => setDraft((current) => ({ ...current, openInNewTab: event.target.checked }))} />
            Open in new tab
          </label>

          {selectedPrimary ? (
            <div className="space-y-2 rounded-control border bg-surface-muted/50 p-3">
              <p className="text-sm font-semibold text-text">Selection Inspector</p>
              <p className="text-xs text-text-muted">{selectedPrimary.title}</p>
              {typeof selectedPrimary.linkTargetJson.pageSlug === "string" ? (
                <Button onClick={() => onOpenPageEditor(selectedPrimary.linkTargetJson.pageSlug as string)} size="sm" type="button" variant="secondary">
                  Open page editor
                </Button>
              ) : null}
            </div>
          ) : null}

          <div className="flex justify-between border-t pt-3">
            <Button onClick={() => setPanelMode("none")} size="sm" type="button" variant="ghost">
              Cancel
            </Button>
            {panelMode === "create" ? (
              <Button disabled={isSaving} onClick={saveCreate} size="sm" type="button">
                <Plus className="h-4 w-4" />
                Create
              </Button>
            ) : (
              <Button disabled={isSaving} onClick={saveUpdate} size="sm" type="button">
                Save
              </Button>
            )}
          </div>
        </div>
      </Panel>
    </Popup>
  );
}
