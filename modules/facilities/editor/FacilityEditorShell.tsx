"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent
} from "react";
import { Move, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { AutosaveIndicator, type AutosaveState } from "@/components/ui/autosave-indicator";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { publishFacilityMapDraftAction, saveFacilityMapDraftAction } from "@/modules/facilities/actions";
import type { Facility, FacilityMapDraft, FacilityMapDraftNode, FacilityMapReadModel, FacilityNode } from "@/modules/facilities/types";
import { DEFAULT_NODE_LAYOUT, sortNodes } from "@/modules/facilities/utils";

type FacilityEditorShellProps = {
  orgSlug: string;
  facility: Facility;
  canWrite: boolean;
  initialReadModel: FacilityMapReadModel;
  onReadModelChange?: (next: FacilityMapReadModel) => void;
};

const CANVAS_WIDTH = 1400;
const CANVAS_HEIGHT = 900;
const GRID_SIZE = 24;
const MIN_NODE_SIZE = 48;
const ZOOM_MIN = 0.45;
const ZOOM_MAX = 2.1;
const ZOOM_STEP = 0.03;

type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

type InteractionState = {
  nodeId: string;
  mode: "move" | "resize";
  handle?: ResizeHandle;
  startX: number;
  startY: number;
  originLayout: FacilityMapDraftNode["layout"];
};

type EditorDraftNode = FacilityMapDraftNode & {
  facilityId: string;
};

function snapToGrid(value: number) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function clampToCanvas(value: number, max: number) {
  return Math.max(0, Math.min(max, snapToGrid(value)));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeResizedLayout(left: number, top: number, right: number, bottom: number, originLayout: FacilityNode["layout"]) {
  const clampedLeft = clamp(left, 0, CANVAS_WIDTH - MIN_NODE_SIZE);
  const clampedTop = clamp(top, 0, CANVAS_HEIGHT - MIN_NODE_SIZE);
  const clampedRight = clamp(right, clampedLeft + MIN_NODE_SIZE, CANVAS_WIDTH);
  const clampedBottom = clamp(bottom, clampedTop + MIN_NODE_SIZE, CANVAS_HEIGHT);

  const snappedLeft = clampToCanvas(clampedLeft, CANVAS_WIDTH - MIN_NODE_SIZE);
  const snappedTop = clampToCanvas(clampedTop, CANVAS_HEIGHT - MIN_NODE_SIZE);
  const snappedRight = clampToCanvas(clampedRight, CANVAS_WIDTH);
  const snappedBottom = clampToCanvas(clampedBottom, CANVAS_HEIGHT);

  const width = Math.max(MIN_NODE_SIZE, snappedRight - snappedLeft);
  const height = Math.max(MIN_NODE_SIZE, snappedBottom - snappedTop);

  const x = clamp(snappedLeft, 0, CANVAS_WIDTH - width);
  const y = clamp(snappedTop, 0, CANVAS_HEIGHT - height);

  return {
    ...originLayout,
    x,
    y,
    w: width,
    h: height
  };
}

function snapLayoutToGrid(layout: FacilityNode["layout"]) {
  return {
    ...layout,
    x: snapToGrid(layout.x),
    y: snapToGrid(layout.y)
  };
}

function isDraftNodeArray(value: unknown): value is FacilityMapDraftNode[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }
    const node = item as Record<string, unknown>;
    return (
      typeof node.id === "string" &&
      (typeof node.publishedNodeId === "string" || node.publishedNodeId === null) &&
      (typeof node.parentId === "string" || node.parentId === null) &&
      typeof node.name === "string" &&
      typeof node.nodeKind === "string" &&
      typeof node.status === "string" &&
      typeof node.isBookable === "boolean" &&
      (typeof node.capacity === "number" || node.capacity === null) &&
      typeof node.sortIndex === "number" &&
      node.layout &&
      typeof node.layout === "object"
    );
  });
}

function toEditorDraftNode(node: FacilityNode): EditorDraftNode {
  return {
    facilityId: node.facilityId,
    id: node.id,
    publishedNodeId: node.id,
    parentId: node.parentNodeId,
    name: node.name,
    nodeKind: node.nodeKind,
    status: node.status,
    isBookable: node.isBookable,
    capacity: node.capacity,
    layout: node.layout,
    metadataJson: node.metadataJson,
    sortIndex: node.sortIndex
  };
}

function buildInitialDraftNodes(facility: Facility, initialReadModel: FacilityMapReadModel): EditorDraftNode[] {
  const publishedNodes = sortNodes(initialReadModel.nodes.filter((node) => node.facilityId === facility.id));
  const metadataDraft = (facility.metadataJson as Record<string, unknown>).mapDraft as FacilityMapDraft | undefined;

  if (metadataDraft && metadataDraft.version === 1 && isDraftNodeArray(metadataDraft.nodes)) {
    return metadataDraft.nodes.map((node) => ({
      ...node,
      facilityId: facility.id,
      layout: normalizeResizedLayout(
        node.layout.x,
        node.layout.y,
        node.layout.x + node.layout.w,
        node.layout.y + node.layout.h,
        node.layout
      )
    }));
  }

  return publishedNodes.map((node) => toEditorDraftNode(node));
}

function getInitialDraftUpdatedAtUtc(facility: Facility) {
  const metadataDraft = (facility.metadataJson as Record<string, unknown>).mapDraft;
  if (!metadataDraft || typeof metadataDraft !== "object" || Array.isArray(metadataDraft)) {
    return null;
  }

  const updatedAtUtc = (metadataDraft as Record<string, unknown>).updatedAtUtc;
  return typeof updatedAtUtc === "string" ? updatedAtUtc : null;
}

function toDraftPayload(node: EditorDraftNode): FacilityMapDraftNode {
  return {
    id: node.id,
    publishedNodeId: node.publishedNodeId,
    parentId: node.parentId,
    name: node.name,
    nodeKind: node.nodeKind,
    status: node.status,
    isBookable: node.isBookable,
    capacity: node.capacity,
    layout: node.layout,
    metadataJson: node.metadataJson,
    sortIndex: node.sortIndex
  };
}

export function FacilityEditorShell({ orgSlug, facility, canWrite, initialReadModel, onReadModelChange }: FacilityEditorShellProps) {
  const { toast } = useToast();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const initialDraftUpdatedAtUtc = getInitialDraftUpdatedAtUtc(facility);
  const [nodes, setNodes] = useState<EditorDraftNode[]>(() => buildInitialDraftNodes(facility, initialReadModel));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [interactionState, setInteractionState] = useState<InteractionState | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [pan, setPan] = useState({ x: 120, y: 90 });
  const [zoom, setZoom] = useState(1);
  const [autosaveState, setAutosaveState] = useState<AutosaveState>(initialDraftUpdatedAtUtc ? "saved" : "idle");
  const [lastSavedAtUtc, setLastSavedAtUtc] = useState<string | null>(initialDraftUpdatedAtUtc);
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const [isPublishing, startPublishing] = useTransition();
  const saveRequestRef = useRef(0);
  const lastSavedSnapshotRef = useRef<string>(
    JSON.stringify(buildInitialDraftNodes(facility, initialReadModel).map((node) => toDraftPayload(node)))
  );
  const draftPayload = useMemo(() => nodes.map((node) => toDraftPayload(node)), [nodes]);
  const draftSnapshot = useMemo(() => JSON.stringify(draftPayload), [draftPayload]);
  const hasUnsavedChanges = draftSnapshot !== lastSavedSnapshotRef.current;

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId) ?? null, [nodes, selectedNodeId]);
  const firstAreaId = useMemo(() => nodes.find((node) => node.nodeKind === "zone")?.id ?? null, [nodes]);

  useEffect(() => {
    if (selectedNodeId && !nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [nodes, selectedNodeId]);

  useEffect(() => {
    if (!interactionState) {
      return;
    }

    const handleMove = (event: PointerEvent) => {
      setNodes((current) =>
        current.map((node) => {
          if (node.id !== interactionState.nodeId) {
            return node;
          }

          const deltaX = event.clientX - interactionState.startX;
          const deltaY = event.clientY - interactionState.startY;

          if (interactionState.mode === "move") {
            const nextX = clampToCanvas(interactionState.originLayout.x + deltaX / zoom, CANVAS_WIDTH - node.layout.w);
            const nextY = clampToCanvas(interactionState.originLayout.y + deltaY / zoom, CANVAS_HEIGHT - node.layout.h);

            return {
              ...node,
              layout: {
                ...node.layout,
                x: nextX,
                y: nextY
              }
            };
          }

          const handle = interactionState.handle;
          if (!handle) {
            return node;
          }

          let left = interactionState.originLayout.x;
          let top = interactionState.originLayout.y;
          let right = interactionState.originLayout.x + interactionState.originLayout.w;
          let bottom = interactionState.originLayout.y + interactionState.originLayout.h;

          if (handle.includes("w")) {
            left += deltaX / zoom;
          }
          if (handle.includes("e")) {
            right += deltaX / zoom;
          }
          if (handle.includes("n")) {
            top += deltaY / zoom;
          }
          if (handle.includes("s")) {
            bottom += deltaY / zoom;
          }

          const nextLayout = normalizeResizedLayout(left, top, right, bottom, node.layout);

          return {
            ...node,
            layout: nextLayout
          };
        })
      );
    };

    const handleUp = () => {
      setInteractionState(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [interactionState, zoom]);

  function mutateNode(nodeId: string, updater: (node: EditorDraftNode) => EditorDraftNode) {
    setNodes((current) => current.map((node) => (node.id === nodeId ? updater(node) : node)));
  }

  function createTypedNode(nodeKind: FacilityNode["nodeKind"], name: string) {
    const parentId = nodeKind === "zone" ? null : selectedNode?.id ?? firstAreaId;

    if (!canWrite) {
      return;
    }

    if (nodeKind !== "zone" && !parentId) {
      toast({
        title: "Add an area first",
        description: "Every map requires at least one area before adding structures or spaces.",
        variant: "destructive"
      });
      return;
    }

    const nextSort = nodes.filter((node) => node.parentId === parentId).length;
    const draftId = `draft-${crypto.randomUUID()}`;
    const nextNode: EditorDraftNode = {
      id: draftId,
      publishedNodeId: null,
      facilityId: facility.id,
      parentId,
      name,
      nodeKind,
      status: "open",
      isBookable: true,
      capacity: null,
      layout: snapLayoutToGrid(DEFAULT_NODE_LAYOUT),
      metadataJson: {},
      sortIndex: nextSort
    };

    setNodes((current) => [...current, nextNode]);
    setSelectedNodeId(draftId);
  }

  function deleteNode(nodeId: string) {
    if (!canWrite) {
      return;
    }

    const childCount = nodes.filter((node) => node.parentId === nodeId).length;
    if (childCount > 0) {
      toast({
        title: "Delete child nodes first",
        variant: "destructive"
      });
      return;
    }

    const node = nodes.find((item) => item.id === nodeId);
    if (node?.nodeKind === "zone") {
      const areaCount = nodes.filter((item) => item.nodeKind === "zone").length;
      if (areaCount <= 1) {
        toast({
          title: "Each map requires at least one area",
          variant: "destructive"
        });
        return;
      }
    }

    setNodes((current) => current.filter((node) => node.id !== nodeId));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  }

  const persistDraft = useCallback(
    async (snapshot: string, payload: FacilityMapDraftNode[]) => {
      if (!canWrite) {
        return false;
      }

      if (snapshot === lastSavedSnapshotRef.current) {
        return true;
      }

      setAutosaveState("saving");
      setAutosaveError(null);
      const requestId = saveRequestRef.current + 1;
      saveRequestRef.current = requestId;

      const result = await saveFacilityMapDraftAction({
        orgSlug,
        facilityId: facility.id,
        nodes: payload
      });

      if (saveRequestRef.current !== requestId) {
        return false;
      }

      if (!result.ok) {
        setAutosaveState("error");
        setAutosaveError(result.error);
        return false;
      }

      lastSavedSnapshotRef.current = snapshot;
      setAutosaveState("saved");
      setAutosaveError(null);
      setLastSavedAtUtc(result.data.updatedAtUtc);
      return true;
    },
    [canWrite, facility.id, orgSlug]
  );

  useEffect(() => {
    if (!canWrite) {
      return;
    }

    if (!hasUnsavedChanges) {
      return;
    }

    setAutosaveState((current) => (current === "saving" ? current : "dirty"));

    const timeoutId = window.setTimeout(() => {
      void persistDraft(draftSnapshot, draftPayload);
    }, 480);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [canWrite, draftPayload, draftSnapshot, hasUnsavedChanges, persistDraft]);

  function saveDraftNow() {
    void persistDraft(draftSnapshot, draftPayload);
  }

  function publishDraft() {
    if (!canWrite) {
      return;
    }

    startPublishing(async () => {
      const saved = await persistDraft(draftSnapshot, draftPayload);
      if (!saved) {
        toast({
          title: "Unable to publish draft",
          description: "Resolve autosave errors and try publishing again.",
          variant: "destructive"
        });
        return;
      }

      const result = await publishFacilityMapDraftAction({
        orgSlug,
        facilityId: facility.id
      });

      if (!result.ok) {
        toast({
          title: "Unable to publish draft",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      const publishedNodes = sortNodes(result.data.readModel.nodes.filter((node) => node.facilityId === facility.id));
      const nextDraftNodes = publishedNodes.map((node) => toEditorDraftNode(node));
      setNodes(nextDraftNodes);
      lastSavedSnapshotRef.current = JSON.stringify(nextDraftNodes.map((node) => toDraftPayload(node)));
      setAutosaveState("saved");
      setAutosaveError(null);
      setLastSavedAtUtc(new Date().toISOString());
      onReadModelChange?.(result.data.readModel);
      toast({ title: "Draft published", variant: "success" });
    });
  }

  function startMoveInteraction(node: EditorDraftNode, event: ReactPointerEvent) {
    if (!canWrite) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setSelectedNodeId(node.id);
    setInteractionState({
      nodeId: node.id,
      mode: "move",
      startX: event.clientX,
      startY: event.clientY,
      originLayout: node.layout
    });
  }

  function startResizeInteraction(node: EditorDraftNode, handle: ResizeHandle, event: ReactPointerEvent) {
    if (!canWrite) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setSelectedNodeId(node.id);
    setInteractionState({
      nodeId: node.id,
      mode: "resize",
      handle,
      startX: event.clientX,
      startY: event.clientY,
      originLayout: node.layout
    });
  }

  const parentNameById = useMemo(() => new Map(nodes.map((node) => [node.id, node.name])), [nodes]);

  const parentGroups = useMemo(() => {
    const byParent = new Map<string | null, EditorDraftNode[]>();
    for (const node of nodes) {
      const current = byParent.get(node.parentId) ?? [];
      current.push(node);
      byParent.set(node.parentId, current);
    }

    return Array.from(byParent.entries()).map(([parentNodeId, groupNodes]) => {
      const left = Math.min(...groupNodes.map((node) => node.layout.x));
      const top = Math.min(...groupNodes.map((node) => node.layout.y));
      const right = Math.max(...groupNodes.map((node) => node.layout.x + node.layout.w));
      const bottom = Math.max(...groupNodes.map((node) => node.layout.y + node.layout.h));
      const padding = 20;
      return {
        parentNodeId,
        label: parentNodeId ? `Parent: ${parentNameById.get(parentNodeId) ?? "Unknown"}` : "Top-level Areas",
        x: Math.max(0, left - padding),
        y: Math.max(0, top - padding),
        w: Math.min(CANVAS_WIDTH, right + padding) - Math.max(0, left - padding),
        h: Math.min(CANVAS_HEIGHT, bottom + padding) - Math.max(0, top - padding)
      };
    });
  }, [nodes, parentNameById]);

  function updateZoom(nextZoom: number) {
    setZoom(clamp(nextZoom, ZOOM_MIN, ZOOM_MAX));
  }

  function handleCanvasWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const direction = event.deltaY < 0 ? 1 : -1;
    updateZoom(zoom + direction * ZOOM_STEP);
  }

  function handleViewportPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("[data-pan-block='true']")) {
      return;
    }

    setIsPanning(true);
    const originX = pan.x;
    const originY = pan.y;
    const startX = event.clientX;
    const startY = event.clientY;

    const handleMove = (moveEvent: PointerEvent) => {
      setPan({
        x: originX + (moveEvent.clientX - startX),
        y: originY + (moveEvent.clientY - startY)
      });
    };

    const handleUp = () => {
      setIsPanning(false);
      window.removeEventListener("pointermove", handleMove);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
  }

  const scaledGridSize = Math.max(10, GRID_SIZE * zoom);
  const gridOffsetX = ((pan.x % scaledGridSize) + scaledGridSize) % scaledGridSize;
  const gridOffsetY = ((pan.y % scaledGridSize) + scaledGridSize) % scaledGridSize;

  const selectedPanelStyle = useMemo<CSSProperties | null>(() => {
    if (!selectedNode) {
      return null;
    }

    const viewportWidth = viewportRef.current?.clientWidth ?? CANVAS_WIDTH;
    const viewportHeight = viewportRef.current?.clientHeight ?? CANVAS_HEIGHT;
    const panelWidth = 340;
    const panelHeight = 520;
    const idealLeft = selectedNode.layout.x + selectedNode.layout.w + 20;
    const maxLeft = (viewportWidth - pan.x) / Math.max(zoom, 0.01) - panelWidth;
    const left = Math.max(12, Math.min(maxLeft, idealLeft));
    const idealTop = selectedNode.layout.y;
    const maxTop = (viewportHeight - pan.y) / Math.max(zoom, 0.01) - panelHeight;
    const top = Math.max(12, Math.min(maxTop, idealTop));

    return {
      left: `${left}px`,
      top: `${top}px`,
      transform: `scale(${1 / zoom})`,
      transformOrigin: "top left"
    };
  }, [pan.x, pan.y, selectedNode, zoom]);

  return (
    <div className="relative h-full min-h-0">
      <div
        className={isPanning ? "relative h-full min-h-0 overflow-hidden rounded-control border bg-surface cursor-grabbing" : "relative h-full min-h-0 overflow-hidden rounded-control border bg-surface cursor-grab"}
        onPointerDown={handleViewportPointerDown}
        onWheel={handleCanvasWheel}
        ref={viewportRef}
        style={{
          backgroundColor: "hsl(var(--surface))",
          backgroundImage:
            "linear-gradient(hsl(var(--border)/0.55) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)/0.55) 1px, transparent 1px)",
          backgroundSize: `${scaledGridSize}px ${scaledGridSize}px`,
          backgroundPosition: `${gridOffsetX}px ${gridOffsetY}px`
        }}
      >
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-4" data-pan-block="true">
          <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-full border border-border/80 bg-surface/95 px-2 py-2 shadow-[0_12px_30px_hsl(220_35%_12%/0.14)] backdrop-blur">
            <Button disabled={!canWrite} onClick={() => createTypedNode("room", "Space")} size="sm" type="button" variant="secondary">
              <Plus className="h-4 w-4" />
              Space
            </Button>
            <Button disabled={!canWrite} onClick={() => createTypedNode("section", "Structure")} size="sm" type="button" variant="secondary">
              <Plus className="h-4 w-4" />
              Structure
            </Button>
            <Button disabled={!canWrite} onClick={() => createTypedNode("zone", "Area")} size="sm" type="button" variant="secondary">
              <Plus className="h-4 w-4" />
              Area
            </Button>
            <Button
              className="text-danger"
              disabled={!canWrite || !selectedNode}
              onClick={() => {
                if (selectedNode) {
                  deleteNode(selectedNode.id);
                }
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
            <Button disabled={!canWrite || autosaveState === "saving" || !hasUnsavedChanges} onClick={saveDraftNow} size="sm" type="button">
              <Save className="h-4 w-4" />
              Save draft
            </Button>
            <Button disabled={!canWrite || isPublishing || !firstAreaId} onClick={publishDraft} size="sm" type="button">
              {isPublishing ? "Publishing..." : "Publish"}
            </Button>
            <AutosaveIndicator
              className="ml-1"
              errorMessage={autosaveError}
              lastSavedAtUtc={lastSavedAtUtc}
              state={autosaveState}
            />
            <Button onClick={() => setSelectedNodeId(null)} size="sm" type="button" variant="ghost">
              Clear
            </Button>
            <Button aria-label="Zoom in" onClick={() => updateZoom(zoom + ZOOM_STEP)} size="sm" type="button" variant="secondary">
              +
            </Button>
            <Button aria-label="Zoom out" onClick={() => updateZoom(zoom - ZOOM_STEP)} size="sm" type="button" variant="secondary">
              -
            </Button>
          </div>
        </div>

        {!firstAreaId ? (
          <div className="pointer-events-none absolute inset-x-0 top-20 z-20 flex justify-center px-4" data-pan-block="true">
            <div className="rounded-full border border-accent/40 bg-accent/12 px-4 py-2 text-xs font-semibold text-text">
              Add at least one Area first. Structures and Spaces must be inside an Area.
            </div>
          </div>
        ) : null}

        <div
          className="absolute left-0 top-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "top left"
          }}
        >
          {parentGroups.map((group) => (
            <div
              className="pointer-events-none absolute rounded-control border-2 border-dashed border-accent/45 bg-accent/5"
              key={group.parentNodeId ?? "root"}
              style={{
                left: `${group.x}px`,
                top: `${group.y}px`,
                width: `${group.w}px`,
                height: `${group.h}px`
              }}
            >
              <span
                className="absolute -top-6 left-0 rounded-full border border-accent/35 bg-surface px-2 py-0.5 text-[11px] font-semibold text-text-muted"
              >
                {group.label}
              </span>
            </div>
          ))}

          {nodes.map((node) => (
            <div
              className={
                node.id === selectedNodeId
                  ? "group absolute rounded-control border border-accent bg-accent/20 shadow-sm"
                  : "group absolute rounded-control border border-border bg-surface shadow-sm"
              }
              data-pan-block="true"
              key={node.id}
              style={{
                left: `${node.layout.x}px`,
                top: `${node.layout.y}px`,
                width: `${node.layout.w}px`,
                height: `${node.layout.h}px`,
                zIndex: node.layout.z
              }}
            >
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-2">
                <div className="pointer-events-auto inline-flex max-w-full items-center gap-2 rounded-full border border-border/65 bg-surface/90 px-3 py-1.5 shadow-sm backdrop-blur-sm transition-all duration-200">
                  <span className="max-w-[180px] truncate text-xs font-semibold text-text">{node.name}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">{node.nodeKind}</span>
                  <div
                    className={
                      node.id === selectedNodeId
                        ? "flex max-w-20 items-center gap-1 overflow-hidden opacity-100 transition-all duration-200"
                        : "flex max-w-0 -translate-x-1 items-center gap-1 overflow-hidden opacity-0 transition-all duration-200 group-hover:max-w-20 group-hover:translate-x-0 group-hover:opacity-100"
                    }
                  >
                    <button
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-surface text-text-muted transition-colors hover:text-text"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setSelectedNodeId(node.id);
                      }}
                      type="button"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-danger/35 bg-surface text-danger transition-colors hover:bg-danger/10"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        deleteNode(node.id);
                      }}
                      type="button"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div
                className={
                  node.id === selectedNodeId
                    ? "pointer-events-auto opacity-100 transition-opacity duration-150"
                    : "pointer-events-none opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100"
                }
              >
                <button
                  aria-label="Move node"
                  className="absolute left-1/2 top-[-12px] z-10 inline-flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-surface text-text-muted shadow-sm hover:text-text"
                  onPointerDown={(event) => startMoveInteraction(node, event)}
                  type="button"
                >
                  <Move className="h-3.5 w-3.5" />
                </button>

                <button
                  aria-label="Resize north"
                  className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 cursor-ns-resize rounded-full border border-border bg-surface shadow-sm"
                  onPointerDown={(event) => startResizeInteraction(node, "n", event)}
                  type="button"
                />
                <button
                  aria-label="Resize south"
                  className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 cursor-ns-resize rounded-full border border-border bg-surface shadow-sm"
                  onPointerDown={(event) => startResizeInteraction(node, "s", event)}
                  type="button"
                />
                <button
                  aria-label="Resize east"
                  className="absolute right-[-8px] top-1/2 h-4 w-4 -translate-y-1/2 cursor-ew-resize rounded-full border border-border bg-surface shadow-sm"
                  onPointerDown={(event) => startResizeInteraction(node, "e", event)}
                  type="button"
                />
                <button
                  aria-label="Resize west"
                  className="absolute left-[-8px] top-1/2 h-4 w-4 -translate-y-1/2 cursor-ew-resize rounded-full border border-border bg-surface shadow-sm"
                  onPointerDown={(event) => startResizeInteraction(node, "w", event)}
                  type="button"
                />
                <button
                  aria-label="Resize north-west"
                  className="absolute -left-2 -top-2 h-4 w-4 cursor-nwse-resize rounded-full border border-border bg-surface shadow-sm"
                  onPointerDown={(event) => startResizeInteraction(node, "nw", event)}
                  type="button"
                />
                <button
                  aria-label="Resize north-east"
                  className="absolute -right-2 -top-2 h-4 w-4 cursor-nesw-resize rounded-full border border-border bg-surface shadow-sm"
                  onPointerDown={(event) => startResizeInteraction(node, "ne", event)}
                  type="button"
                />
                <button
                  aria-label="Resize south-west"
                  className="absolute -bottom-2 -left-2 h-4 w-4 cursor-nesw-resize rounded-full border border-border bg-surface shadow-sm"
                  onPointerDown={(event) => startResizeInteraction(node, "sw", event)}
                  type="button"
                />
                <button
                  aria-label="Resize south-east"
                  className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded-full border border-border bg-surface shadow-sm"
                  onPointerDown={(event) => startResizeInteraction(node, "se", event)}
                  type="button"
                />
              </div>
            </div>
          ))}

          {!selectedNode ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-20 flex justify-center px-4">
              <div
                className="rounded-full border border-border/70 bg-surface/95 px-4 py-2 text-xs text-text-muted shadow-sm backdrop-blur"
              >
                Hover a node to drag or resize. Use the pencil icon to edit. Drag white space to pan. Scroll to zoom.
              </div>
            </div>
          ) : null}

          {selectedNode && selectedPanelStyle ? (
            <div className="absolute z-30 w-[340px]" data-pan-block="true" style={selectedPanelStyle}>
              <div className="rounded-card border border-border/85 bg-surface/98 p-3 shadow-[0_18px_40px_hsl(220_35%_12%/0.2)] backdrop-blur">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-text">Edit node</p>
                  <Button onClick={() => setSelectedNodeId(null)} size="sm" type="button" variant="ghost">
                    Done
                  </Button>
                </div>

                <div className="space-y-3">
                  <FormField label="Name">
                    <Input
                      disabled={!canWrite}
                      onChange={(event) => mutateNode(selectedNode.id, (node) => ({ ...node, name: event.target.value }))}
                      value={selectedNode.name}
                    />
                  </FormField>

                  <FormField label="Node kind">
                    <Select
                      disabled={!canWrite}
                      onChange={(event) =>
                        mutateNode(selectedNode.id, (node) => ({
                          ...node,
                          nodeKind: event.target.value as FacilityNode["nodeKind"]
                        }))
                      }
                      options={[
                        { value: "facility", label: "Facility" },
                        { value: "zone", label: "Zone" },
                        { value: "building", label: "Building" },
                        { value: "section", label: "Section" },
                        { value: "field", label: "Field" },
                        { value: "court", label: "Court" },
                        { value: "diamond", label: "Diamond" },
                        { value: "rink", label: "Rink" },
                        { value: "room", label: "Room" },
                        { value: "amenity", label: "Amenity" },
                        { value: "parking", label: "Parking" },
                        { value: "support_area", label: "Support area" },
                        { value: "custom", label: "Custom" }
                      ]}
                      value={selectedNode.nodeKind}
                    />
                  </FormField>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="Status">
                      <Select
                        disabled={!canWrite}
                        onChange={(event) =>
                          mutateNode(selectedNode.id, (node) => ({
                            ...node,
                            status: event.target.value as FacilityNode["status"]
                          }))
                        }
                        options={[
                          { value: "open", label: "Open" },
                          { value: "closed", label: "Closed" },
                          { value: "archived", label: "Archived" }
                        ]}
                        value={selectedNode.status}
                      />
                    </FormField>
                    <FormField label="Capacity">
                      <Input
                        disabled={!canWrite}
                        min={0}
                        onChange={(event) =>
                          mutateNode(selectedNode.id, (node) => ({
                            ...node,
                            capacity: event.target.value.trim().length > 0 ? Number.parseInt(event.target.value, 10) : null
                          }))
                        }
                        type="number"
                        value={selectedNode.capacity?.toString() ?? ""}
                      />
                    </FormField>
                  </div>

                  <label className="ui-inline-toggle">
                    <Checkbox
                      checked={selectedNode.isBookable}
                      disabled={!canWrite}
                      onChange={(event) => mutateNode(selectedNode.id, (node) => ({ ...node, isBookable: event.target.checked }))}
                    />
                    Bookable
                  </label>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
