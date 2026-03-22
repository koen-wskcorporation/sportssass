"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Alert } from "@orgframe/ui/ui/alert";
import { Button } from "@orgframe/ui/ui/button";
import { Copy, RotateCw, Settings2, Trash2 } from "lucide-react";
import { type CanvasViewportHandle } from "@orgframe/ui/ui/canvas-viewport";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@orgframe/ui/ui/card";
import { Checkbox } from "@orgframe/ui/ui/checkbox";
import { Chip } from "@orgframe/ui/ui/chip";
import { useConfirmDialog } from "@orgframe/ui/ui/confirm-dialog";
import { FormField } from "@orgframe/ui/ui/form-field";
import { Input } from "@orgframe/ui/ui/input";
import { Popover } from "@orgframe/ui/ui/popover";
import { Popup } from "@orgframe/ui/ui/popup";
import { Select } from "@orgframe/ui/ui/select";
import { StructureCanvas } from "@orgframe/ui/modules/core/components/StructureCanvas";
import { StructureNode } from "@orgframe/ui/modules/core/components/StructureNode";
import {
  buildRoundedPolygonPath,
  getFacilityPolygonGeometry,
  getPolygonBounds,
  pointInPolygon,
  polygonSelfIntersects,
  polygonToFloorPlanPatch,
  translatePolygon,
  type PolygonPoint
} from "@orgframe/ui/modules/facilities/lib/polygon-geometry";
import type { FacilitySpace } from "@/modules/facilities/types";

type StructureElementType = "room" | "court" | "field" | "custom" | "structure";

type SpaceEditorDraft = {
  mode: "edit";
  spaceId: string | null;
  name: string;
  slug: string;
  elementType: StructureElementType;
  status: FacilitySpace["status"];
  isBookable: boolean;
  timezone: string;
  capacity: string;
};

type EditorTabKey = "general" | "scheduling" | "access" | "attributes" | "relationships" | "advanced";

type RoomLayout = {
  points: PolygonPoint[];
  smoothPoints: number[];
  x: number;
  y: number;
  width: number;
  height: number;
};

const CANVAS_GRID_SIZE = 25;
const CANVAS_GRID_PITCH = CANVAS_GRID_SIZE;
const CANVAS_POSITION_STEP = CANVAS_GRID_PITCH;
const CANVAS_SIZE_STEP = CANVAS_GRID_SIZE;
const NODE_MIN_SIZE = 5;
const HANDLE_SIZE = 14;
const MIN_POLYGON_SPAN = CANVAS_GRID_SIZE;
const GRID_NUMERIC_SCALE = 10;
const EDGE_INSERT_HIT_DISTANCE = 10;
const EDGE_INSERT_VERTEX_EXCLUSION_DISTANCE = 18;
const EDGE_INSERT_ICON_OFFSET = 10;
const ROTATE_HANDLE_OFFSET = 26;
const ROTATION_STEP_RADIANS = Math.PI / 4;

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function isRoomKind(kind: FacilitySpace["spaceKind"]) {
  return kind === "room" || kind === "court" || kind === "field" || kind === "custom";
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asIntegerArray(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => Math.trunc(Number(entry))).filter((entry) => Number.isFinite(entry));
}

function isFinitePoint(point: PolygonPoint) {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function snapByStep(value: number, step: number) {
  const scaledValue = Math.round(value * GRID_NUMERIC_SCALE);
  const scaledStep = Math.max(1, Math.round(step * GRID_NUMERIC_SCALE));
  const snappedScaled = Math.round(scaledValue / scaledStep) * scaledStep;
  return snappedScaled / GRID_NUMERIC_SCALE;
}

function getRoomLayout(space: FacilitySpace, index: number): RoomLayout {
  const metadata = asObject(space.metadataJson);
  const floorPlan = asObject(metadata.floorPlan);
  const fallbackX = CANVAS_GRID_PITCH + (index % 6) * 200;
  const fallbackY = CANVAS_GRID_PITCH + Math.floor(index / 6) * 150;
  const rawWidth = Math.max(NODE_MIN_SIZE, asNumber(floorPlan.width, CANVAS_GRID_SIZE * 8));
  const rawHeight = Math.max(NODE_MIN_SIZE, asNumber(floorPlan.height, CANVAS_GRID_SIZE * 5));
  const geometry = getFacilityPolygonGeometry(floorPlan, {
    x: asNumber(floorPlan.x, fallbackX),
    y: asNumber(floorPlan.y, fallbackY),
    width: rawWidth,
    height: rawHeight
  });
  const explicitSmoothPoints = normalizeSmoothPoints(asIntegerArray(floorPlan.smoothPoints), geometry.points.length);
  const smoothPoints = explicitSmoothPoints.length > 0
    ? explicitSmoothPoints
    : deriveSmoothPointsFromCurvedEdges(asIntegerArray(floorPlan.curvedEdges), geometry.points.length);
  return layoutFromPoints(
    geometry.points.map((point) => ({ x: snapToGrid(point.x), y: snapToGrid(point.y) })),
    smoothPoints
  );
}

function roundLayout(layout: RoomLayout): RoomLayout {
  return layoutFromPoints(
    layout.points.map((point) => ({ x: snapToGrid(point.x), y: snapToGrid(point.y) })),
    layout.smoothPoints
  );
}

function areLayoutsEqual(a: RoomLayout, b: RoomLayout) {
  if (a.points.length !== b.points.length) {
    return false;
  }
  const pointsMatch = a.points.every((point, index) => {
    const other = b.points[index];
    return other && point.x === other.x && point.y === other.y;
  });
  if (!pointsMatch) {
    return false;
  }
  if (a.smoothPoints.length !== b.smoothPoints.length) {
    return false;
  }
  return a.smoothPoints.every((index, position) => b.smoothPoints[position] === index);
}

function snapToGrid(value: number) {
  return snapByStep(value, CANVAS_POSITION_STEP);
}

function snapSizeToGrid(value: number) {
  const minSize = Math.max(NODE_MIN_SIZE, CANVAS_SIZE_STEP);
  if (value <= CANVAS_GRID_SIZE) {
    return minSize;
  }

  const snappedRemainder = snapByStep(value - CANVAS_GRID_SIZE, CANVAS_GRID_PITCH);
  return Math.max(minSize, CANVAS_GRID_SIZE + Math.max(0, snappedRemainder));
}

function normalizeSmoothPoints(smoothPoints: number[], pointCount: number): number[] {
  const unique = new Set<number>();
  smoothPoints.forEach((entry) => {
    const index = Math.trunc(entry);
    if (index >= 0 && index < pointCount) {
      unique.add(index);
    }
  });
  return Array.from(unique).sort((a, b) => a - b);
}

function deriveSmoothPointsFromCurvedEdges(curvedEdges: number[], pointCount: number): number[] {
  if (pointCount < 3) {
    return [];
  }
  const normalizedEdges = new Set(
    curvedEdges
      .map((entry) => Math.trunc(entry))
      .filter((index) => index >= 0 && index < pointCount)
  );
  const smoothPoints: number[] = [];
  for (let index = 0; index < pointCount; index += 1) {
    const incomingEdge = ((index - 1) + pointCount) % pointCount;
    const outgoingEdge = index;
    if (normalizedEdges.has(incomingEdge) && normalizedEdges.has(outgoingEdge)) {
      smoothPoints.push(index);
    }
  }
  return smoothPoints;
}

function layoutFromPoints(points: PolygonPoint[], smoothPoints: number[] = []): RoomLayout {
  const bounds = getPolygonBounds(points);
  return {
    points,
    smoothPoints: normalizeSmoothPoints(smoothPoints, points.length),
    x: bounds.left,
    y: bounds.top,
    width: Math.max(NODE_MIN_SIZE, bounds.width),
    height: Math.max(NODE_MIN_SIZE, bounds.height)
  };
}

function rectPolygonPoints(x: number, y: number, width: number, height: number): PolygonPoint[] {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height }
  ];
}

function isEditablePolygon(points: PolygonPoint[]) {
  if (points.length < 3) {
    return false;
  }
  if (polygonSelfIntersects(points)) {
    return false;
  }
  const bounds = getPolygonBounds(points);
  return bounds.width >= MIN_POLYGON_SPAN && bounds.height >= MIN_POLYGON_SPAN;
}

function isDeletablePolygon(points: PolygonPoint[]) {
  if (points.length < 3) {
    return false;
  }
  return !polygonSelfIntersects(points);
}

function getDistance(a: PolygonPoint, b: PolygonPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getClosestPointOnSegment(
  point: PolygonPoint,
  segmentStart: PolygonPoint,
  segmentEnd: PolygonPoint
): { x: number; y: number; distance: number } {
  const dx = segmentEnd.x - segmentStart.x;
  const dy = segmentEnd.y - segmentStart.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq <= Number.EPSILON) {
    return {
      x: segmentStart.x,
      y: segmentStart.y,
      distance: getDistance(point, segmentStart)
    };
  }
  const t = Math.max(0, Math.min(1, ((point.x - segmentStart.x) * dx + (point.y - segmentStart.y) * dy) / lengthSq));
  const x = segmentStart.x + t * dx;
  const y = segmentStart.y + t * dy;
  return {
    x,
    y,
    distance: Math.hypot(point.x - x, point.y - y)
  };
}

function getEdgeInsertCandidate(point: PolygonPoint, points: PolygonPoint[]) {
  if (points.length < 3) {
    return null;
  }
  const tooCloseToVertex = points.some((vertex) => getDistance(point, vertex) <= EDGE_INSERT_VERTEX_EXCLUSION_DISTANCE);
  if (tooCloseToVertex) {
    return null;
  }
  let best:
    | {
        edgeIndex: number;
        x: number;
        y: number;
        distance: number;
      }
    | null = null;
  for (let index = 0; index < points.length; index += 1) {
    const start = points[index];
    const end = points[(index + 1) % points.length];
    const candidate = getClosestPointOnSegment(point, start, end);
    if (!best || candidate.distance < best.distance) {
      best = {
        edgeIndex: index,
        x: candidate.x,
        y: candidate.y,
        distance: candidate.distance
      };
    }
  }
  if (!best || best.distance > EDGE_INSERT_HIT_DISTANCE) {
    return null;
  }
  return best;
}

function getPolygonCentroid(points: PolygonPoint[]): PolygonPoint {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }
  if (points.length < 3) {
    const avg = points.reduce(
      (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
      { x: 0, y: 0 }
    );
    return { x: avg.x / points.length, y: avg.y / points.length };
  }

  let areaTwice = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const cross = a.x * b.y - b.x * a.y;
    areaTwice += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }

  if (Math.abs(areaTwice) < 1e-7) {
    const avg = points.reduce(
      (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
      { x: 0, y: 0 }
    );
    return { x: avg.x / points.length, y: avg.y / points.length };
  }

  return {
    x: cx / (3 * areaTwice),
    y: cy / (3 * areaTwice)
  };
}

function rotatePoint(point: PolygonPoint, center: PolygonPoint, angleRadians: number): PolygonPoint {
  const cos = Math.cos(angleRadians);
  const sin = Math.sin(angleRadians);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  };
}

function remapSmoothPointsAfterInsert(smoothPoints: number[], insertedAfterEdgeIndex: number): number[] {
  return smoothPoints.map((pointIndex) => (pointIndex > insertedAfterEdgeIndex ? pointIndex + 1 : pointIndex));
}

function remapSmoothPointsAfterDelete(smoothPoints: number[], deletedVertexIndex: number, nextPointCount: number): number[] {
  const remapped = smoothPoints
    .filter((pointIndex) => pointIndex !== deletedVertexIndex)
    .map((pointIndex) => (pointIndex > deletedVertexIndex ? pointIndex - 1 : pointIndex));
  return normalizeSmoothPoints(remapped, nextPointCount);
}

function resolveElementType(space: FacilitySpace | null): StructureElementType {
  if (!space) {
    return "room";
  }

  const metadata = asObject(space.metadataJson);
  const floorPlan = asObject(metadata.floorPlan);
  const metadataElementType = floorPlan.elementType;
  if (metadataElementType === "structure" || metadataElementType === "hallway" || metadataElementType === "entryway") {
    return "structure";
  }

  if (space.spaceKind === "room" || space.spaceKind === "court" || space.spaceKind === "field" || space.spaceKind === "custom") {
    return space.spaceKind;
  }

  return "room";
}

function toSpaceKind(elementType: StructureElementType): FacilitySpace["spaceKind"] {
  if (elementType === "structure") {
    return "custom";
  }

  return elementType;
}

function isNonBookableElementType(elementType: StructureElementType) {
  return elementType === "structure";
}

function resolveFacilitySpaceStatusChip(status: FacilitySpace["status"]) {
  switch (status) {
    case "open":
      return { label: "Open", color: "green" as const };
    case "closed":
      return { label: "Closed", color: "yellow" as const };
    case "archived":
      return { label: "Archived", color: "neutral" as const };
    default:
      return { label: status, color: "neutral" as const };
  }
}

function resolveFacilityNodeStateChip(elementType: StructureElementType, isBookable: boolean) {
  if (elementType === "structure") {
    return { label: "Structure", color: "neutral" as const };
  }

  if (isBookable) {
    return { label: "Bookable", color: "green" as const };
  }

  return { label: "Not bookable", color: "yellow" as const };
}

function resolveBuildingContext(selectedSpace: FacilitySpace, byId: Map<string, FacilitySpace>) {
  if (selectedSpace.spaceKind === "building") {
    return selectedSpace;
  }

  let cursor = selectedSpace.parentSpaceId;
  while (cursor) {
    const candidate = byId.get(cursor);
    if (!candidate) {
      return null;
    }

    if (candidate.spaceKind === "building") {
      return candidate;
    }

    cursor = candidate.parentSpaceId;
  }

  return null;
}

function isDescendantOf(space: FacilitySpace, ancestorId: string, byId: Map<string, FacilitySpace>) {
  let cursor = space.parentSpaceId;
  while (cursor) {
    if (cursor === ancestorId) {
      return true;
    }

    const parent = byId.get(cursor);
    if (!parent) {
      return false;
    }
    cursor = parent.parentSpaceId;
  }

  return false;
}

type FacilityStructurePanelProps = {
  orgSlug: string;
  selectedSpace: FacilitySpace;
  spaces: FacilitySpace[];
  canWrite: boolean;
  isMutating: boolean;
  onCreateSpace: (input: {
    parentSpaceId: string | null;
    name: string;
    slug: string;
    spaceKind: FacilitySpace["spaceKind"];
    status: FacilitySpace["status"];
    isBookable: boolean;
    timezone: string;
    capacity: number | null;
    sortIndex: number;
    metadataJson?: Record<string, unknown>;
  }) => void;
  onUpdateSpace: (input: {
    spaceId: string;
    parentSpaceId: string | null;
    name: string;
    slug: string;
    spaceKind: FacilitySpace["spaceKind"];
    status: FacilitySpace["status"];
    isBookable: boolean;
    timezone: string;
    capacity: number | null;
    sortIndex: number;
    metadataJson?: Record<string, unknown>;
  }) => void;
  onArchiveSpace: (spaceId: string) => void;
  onDeleteSpace: (spaceId: string) => void;
};

export function FacilityStructurePanel({
  orgSlug,
  selectedSpace,
  spaces,
  canWrite,
  isMutating: _isMutating,
  onCreateSpace,
  onUpdateSpace,
  onArchiveSpace,
  onDeleteSpace
}: FacilityStructurePanelProps) {
  const { confirm } = useConfirmDialog();
  const isMutating = _isMutating;
  const [structureSearch, setStructureSearch] = useState("");
  const [structureScale, setStructureScale] = useState(1);
  const [structureZoomPercent, setStructureZoomPercent] = useState(100);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);
  const [spaceEditorDraft, setSpaceEditorDraft] = useState<SpaceEditorDraft | null>(null);
  const [spaceEditorInitialDraft, setSpaceEditorInitialDraft] = useState<SpaceEditorDraft | null>(null);
  const [editorTab, setEditorTab] = useState<EditorTabKey>("general");
  const [editorError, setEditorError] = useState<string | null>(null);
  const [isStructureCanvasEditMode, setIsStructureCanvasEditMode] = useState(false);
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);
  const [pasteCount, setPasteCount] = useState(0);
  const [vertexPopover, setVertexPopover] = useState<{ roomId: string; vertexIndex: number; x: number; y: number } | null>(null);
  const [roomActionPopover, setRoomActionPopover] = useState<{ roomId: string; x: number; y: number } | null>(null);
  const [edgeInsertHover, setEdgeInsertHover] = useState<{ roomId: string; edgeIndex: number; x: number; y: number } | null>(null);
  const [dragState, setDragState] = useState<
    | {
        mode: "move";
        roomId: string;
        roomIds: string[];
        startX: number;
        startY: number;
        origin: RoomLayout;
        originsByRoomId?: Record<string, RoomLayout>;
        originLeft: number;
        originTop: number;
        snappedDeltaX: number;
        snappedDeltaY: number;
        hasCrossedThreshold: boolean;
      }
    | {
        mode: "vertex";
        roomId: string;
        startX: number;
        startY: number;
        vertexIndex: number;
        originPoints: PolygonPoint[];
        smoothPoints: number[];
        hasCrossedThreshold: boolean;
      }
    | {
        mode: "rotate";
        roomId: string;
        startX: number;
        startY: number;
        originPoints: PolygonPoint[];
        smoothPoints: number[];
        center: PolygonPoint;
        centerClientX: number;
        centerClientY: number;
        startAngle: number;
        hasCrossedThreshold: boolean;
      }
    | null
  >(null);
  const recentHandleDragAtRef = useRef(0);
  const [layoutDraftByRoomId, setLayoutDraftByRoomId] = useState<Record<string, RoomLayout>>({});
  const layoutDraftByRoomIdRef = useRef<Record<string, RoomLayout>>({});
  const structureCanvasRef = useRef<CanvasViewportHandle | null>(null);
  const structureSearchInputRef = useRef<HTMLInputElement | null>(null);
  const optimisticIdRef = useRef(0);
  const [optimisticSpaces, setOptimisticSpaces] = useState<FacilitySpace[]>(spaces);

  useEffect(() => {
    setOptimisticSpaces(spaces);
  }, [spaces]);

  const effectiveSpaces = optimisticSpaces;
  const selectedRoomIdSet = useMemo(() => new Set(selectedRoomIds), [selectedRoomIds]);

  function createSpaceOptimistically(input: Parameters<FacilityStructurePanelProps["onCreateSpace"]>[0]) {
    const now = new Date().toISOString();
    const optimisticId = `optimistic-space-${optimisticIdRef.current++}`;
    const optimisticSpace: FacilitySpace = {
      id: optimisticId,
      orgId: selectedSpace.orgId,
      parentSpaceId: input.parentSpaceId,
      name: input.name,
      slug: input.slug,
      spaceKind: input.spaceKind,
      status: input.status,
      isBookable: input.isBookable,
      timezone: input.timezone,
      capacity: input.capacity,
      metadataJson: input.metadataJson ?? {},
      statusLabelsJson: {},
      sortIndex: input.sortIndex,
      createdAt: now,
      updatedAt: now
    };

    setOptimisticSpaces((current) => [...current, optimisticSpace]);
    onCreateSpace(input);
    return optimisticSpace;
  }

  function updateSpaceOptimistically(input: Parameters<FacilityStructurePanelProps["onUpdateSpace"]>[0]) {
    setOptimisticSpaces((current) =>
      current.map((space) =>
        space.id === input.spaceId
          ? {
              ...space,
              parentSpaceId: input.parentSpaceId,
              name: input.name,
              slug: input.slug,
              spaceKind: input.spaceKind,
              status: input.status,
              isBookable: input.isBookable,
              timezone: input.timezone,
              capacity: input.capacity,
              sortIndex: input.sortIndex,
              metadataJson: input.metadataJson ?? space.metadataJson,
              updatedAt: new Date().toISOString()
            }
          : space
      )
    );
    onUpdateSpace(input);
  }

  function deleteSpaceOptimistically(spaceId: string) {
    setOptimisticSpaces((current) => current.filter((space) => space.id !== spaceId));
    onDeleteSpace(spaceId);
  }

  function archiveSpaceOptimistically(spaceId: string) {
    setOptimisticSpaces((current) =>
      current.map((space) => (space.id === spaceId ? { ...space, status: "archived", updatedAt: new Date().toISOString() } : space))
    );
    onArchiveSpace(spaceId);
  }

  function clearNodeSelection() {
    setActiveRoomId(null);
    setSelectedRoomIds([]);
    setHoveredRoomId(null);
    setEdgeInsertHover(null);
  }

  function handleCanvasPointerDownCapture(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest("[data-structure-node-id]")) {
      return;
    }

    clearNodeSelection();
  }

  const spaceById = useMemo(() => new Map(effectiveSpaces.map((space) => [space.id, space])), [effectiveSpaces]);
  const building = useMemo(() => resolveBuildingContext(selectedSpace, spaceById), [selectedSpace, spaceById]);
  const mappingRoot = building ?? selectedSpace;
  const rooms = useMemo(
    () =>
      effectiveSpaces
        .filter((space) => space.status !== "archived" && isRoomKind(space.spaceKind) && isDescendantOf(space, mappingRoot.id, spaceById))
        .sort((a, b) => a.sortIndex - b.sortIndex || a.name.localeCompare(b.name)),
    [effectiveSpaces, mappingRoot.id, spaceById]
  );

  const roomFitBounds = useMemo(() => {
    const fitLayouts: RoomLayout[] = rooms.map((room, index) => layoutDraftByRoomId[room.id] ?? getRoomLayout(room, index));

    if (fitLayouts.length === 0) {
      return null;
    }

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    fitLayouts.forEach((layout) => {
      minX = Math.min(minX, layout.x);
      minY = Math.min(minY, layout.y);
      maxX = Math.max(maxX, layout.x + layout.width);
      maxY = Math.max(maxY, layout.y + layout.height);
    });

    const padding = Math.max(16, CANVAS_GRID_SIZE);
    const left = Math.floor(minX - padding);
    const top = Math.floor(minY - padding);
    const width = Math.max(1, Math.ceil(maxX - minX + padding * 2));
    const height = Math.max(1, Math.ceil(maxY - minY + padding * 2));
    return { left, top, width, height };
  }, [layoutDraftByRoomId, rooms]);

  const autoFitSignature = useMemo(
    () => rooms.map((room) => room.id).join("|"),
    [rooms]
  );

  function handleFitToRooms(options?: { viewportOffsetX?: number; viewportOffsetY?: number; animated?: boolean }) {
    if (!roomFitBounds) {
      structureCanvasRef.current?.fitToView(options);
      return;
    }

    structureCanvasRef.current?.fitToBounds({
      x: roomFitBounds.left,
      y: roomFitBounds.top,
      width: roomFitBounds.width,
      height: roomFitBounds.height
    }, options);
  }

  useEffect(() => {
    const nextDraft: Record<string, RoomLayout> = {};
    rooms.forEach((room, index) => {
      nextDraft[room.id] = getRoomLayout(room, index);
    });

    layoutDraftByRoomIdRef.current = nextDraft;
    setLayoutDraftByRoomId(nextDraft);
  }, [rooms]);

  useEffect(() => {
    const roomIdSet = new Set(rooms.map((room) => room.id));
    setSelectedRoomIds((current) => current.filter((roomId) => roomIdSet.has(roomId)));
    setActiveRoomId((current) => (current && roomIdSet.has(current) ? current : null));
  }, [rooms]);

  useEffect(() => {
    const closePopovers = () => {
      setVertexPopover(null);
      setRoomActionPopover(null);
    };
    window.addEventListener("structure-node-actions-open", closePopovers as EventListener);
    return () => {
      window.removeEventListener("structure-node-actions-open", closePopovers as EventListener);
    };
  }, []);

  const normalizedSearch = structureSearch.trim().toLowerCase();
  const normalizeSearchKey = useCallback((value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, ""), []);
  const matchingRooms = useMemo(() => {
    if (!normalizedSearch) {
      return [];
    }

    const queryKey = normalizeSearchKey(normalizedSearch);
    if (!queryKey) {
      return [];
    }

    return rooms.filter((room) => normalizeSearchKey(room.name).includes(queryKey));
  }, [normalizeSearchKey, normalizedSearch, rooms]);

  const canvasCenterTitle = mappingRoot.name;
  const mapCanEdit = canWrite && isStructureCanvasEditMode;
  const editorTabs: Array<{ key: EditorTabKey; label: string; description: string }> = [
    { key: "general", label: "General", description: "Name and core node identity." },
    { key: "scheduling", label: "Scheduling", description: "Timezone and booking-time defaults." },
    { key: "access", label: "Access / Visibility", description: "Operational status and booking access." },
    { key: "attributes", label: "Attributes / Settings", description: "Capacities and node-level configuration." },
    { key: "relationships", label: "Relationships", description: "Parent and facility context." },
    { key: "advanced", label: "Advanced", description: "IDs and destructive actions." }
  ];

  const sanitizeDraft = useCallback((draft: SpaceEditorDraft): SpaceEditorDraft => {
    const elementType = draft.elementType;
    const nonBookable = isNonBookableElementType(elementType);
    return {
      ...draft,
      isBookable: nonBookable ? false : draft.isBookable,
      slug: slugify(draft.slug || draft.name),
      timezone: draft.timezone.trim() || mappingRoot.timezone,
      capacity: draft.capacity.trim()
    };
  }, [mappingRoot.timezone]);

  const activeEditorDraft = spaceEditorDraft ? sanitizeDraft(spaceEditorDraft) : null;
  const isEditorOpen = Boolean(spaceEditorDraft);
  const activeNameInvalid = Boolean(activeEditorDraft && activeEditorDraft.name.trim().length < 2);
  const tabHasError: Partial<Record<EditorTabKey, boolean>> = {
    general: activeNameInvalid
  };
  const activeSpaceForEditor = useMemo(() => {
    if (!activeEditorDraft?.spaceId) {
      return null;
    }
    return spaceById.get(activeEditorDraft.spaceId) ?? null;
  }, [activeEditorDraft?.spaceId, spaceById]);

  function persistRoomLayout(roomId: string, layout: RoomLayout) {
    const room = spaceById.get(roomId);
    if (!room || !canWrite) {
      return;
    }

    const roundedLayout = roundLayout(layout);
    if (roundedLayout.points.length < 3 || !roundedLayout.points.every(isFinitePoint)) {
      return;
    }
    if (!roundedLayout.smoothPoints.every((index) => Number.isInteger(index) && index >= 0 && index < roundedLayout.points.length)) {
      return;
    }
    const metadata = asObject(room.metadataJson);
    const floorPlan = asObject(metadata.floorPlan);
    const existingLayout = getRoomLayout(room, 0);
    if (areLayoutsEqual(existingLayout, roundedLayout)) {
      return;
    }

    updateSpaceOptimistically({
      spaceId: room.id,
      parentSpaceId: room.parentSpaceId,
      name: room.name,
      slug: room.slug,
      spaceKind: room.spaceKind,
      status: room.status,
      isBookable: room.isBookable,
      timezone: room.timezone,
      capacity: room.capacity,
      sortIndex: room.sortIndex,
      metadataJson: {
        ...metadata,
        floorPlan: polygonToFloorPlanPatch(roundedLayout.points, floorPlan, roundedLayout.smoothPoints)
      }
    });
  }

  useEffect(() => {
    if (!dragState) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.buttons === 0) {
        setDragState(null);
        return;
      }

      const dxRaw = (event.clientX - dragState.startX) / Math.max(0.2, structureScale);
      const dyRaw = (event.clientY - dragState.startY) / Math.max(0.2, structureScale);
      const hasCrossedThreshold = dragState.hasCrossedThreshold || Math.abs(dxRaw) >= 4 || Math.abs(dyRaw) >= 4;
      if (!hasCrossedThreshold) {
        return;
      }

      if (!dragState.hasCrossedThreshold) {
        setDragState((current) => (current ? { ...current, hasCrossedThreshold: true } : current));
      }

      if (dragState.mode === "move") {
        const snappedLeft = snapToGrid(dragState.originLeft + dxRaw);
        const snappedTop = snapToGrid(dragState.originTop + dyRaw);
        const deltaX = snappedLeft - dragState.originLeft;
        const deltaY = snappedTop - dragState.originTop;

        setDragState((current) =>
          current && current.mode === "move"
            ? {
                ...current,
                snappedDeltaX: deltaX,
                snappedDeltaY: deltaY
              }
            : current
        );

        setLayoutDraftByRoomId((current) => {
          const nextState = { ...current };
          const origins = dragState.originsByRoomId ?? { [dragState.roomId]: dragState.origin };
          for (const moveRoomId of dragState.roomIds) {
            const origin = origins[moveRoomId];
            if (!origin) {
              continue;
            }
            const translated = translatePolygon(origin.points, deltaX, deltaY).map((point) => ({
              x: snapToGrid(point.x),
              y: snapToGrid(point.y)
            }));
            nextState[moveRoomId] = layoutFromPoints(translated, origin.smoothPoints);
          }
          layoutDraftByRoomIdRef.current = nextState;
          return nextState;
        });
        return;
      }

      if (dragState.mode === "vertex") {
        const originVertex = dragState.originPoints[dragState.vertexIndex];
        if (!originVertex) {
          return;
        }
        const nextPoints = dragState.originPoints.map((point, index) =>
          index === dragState.vertexIndex
            ? {
                x: snapToGrid(originVertex.x + dxRaw),
                y: snapToGrid(originVertex.y + dyRaw)
              }
            : point
        );
        if (!isEditablePolygon(nextPoints)) {
          return;
        }
        setLayoutDraftByRoomId((current) => {
          const nextState = {
            ...current,
            [dragState.roomId]: layoutFromPoints(nextPoints, dragState.smoothPoints)
          };
          layoutDraftByRoomIdRef.current = nextState;
          return nextState;
        });
        return;
      }

      const pointerAngle = Math.atan2(event.clientY - dragState.centerClientY, event.clientX - dragState.centerClientX);
      const rawDeltaAngle = pointerAngle - dragState.startAngle;
      const deltaAngle = Math.round(rawDeltaAngle / ROTATION_STEP_RADIANS) * ROTATION_STEP_RADIANS;
      const rotatedPoints = dragState.originPoints.map((point) => {
        const rotated = rotatePoint(point, dragState.center, deltaAngle);
        return {
          x: snapToGrid(rotated.x),
          y: snapToGrid(rotated.y)
        };
      });
      if (!isEditablePolygon(rotatedPoints)) {
        return;
      }
      setLayoutDraftByRoomId((current) => {
        const nextState = {
          ...current,
          [dragState.roomId]: layoutFromPoints(rotatedPoints, dragState.smoothPoints)
        };
        layoutDraftByRoomIdRef.current = nextState;
        return nextState;
      });
    };

    const handlePointerUp = () => {
      if (dragState.mode === "move" && !dragState.hasCrossedThreshold) {
        setDragState(null);
        return;
      }

      if (dragState.mode === "move") {
        const origins = dragState.originsByRoomId ?? { [dragState.roomId]: dragState.origin };
        for (const moveRoomId of dragState.roomIds) {
          const fallbackLayout = origins[moveRoomId];
          if (!fallbackLayout) {
            continue;
          }
          const layout = layoutDraftByRoomIdRef.current[moveRoomId] ?? fallbackLayout;
          persistRoomLayout(moveRoomId, layout);
        }
      } else if (dragState.mode === "vertex") {
        if (!dragState.hasCrossedThreshold) {
          openVertexDeletePopover({
            roomId: dragState.roomId,
            vertexIndex: dragState.vertexIndex,
            x: dragState.startX + 10,
            y: dragState.startY + 10
          });
          setDragState(null);
          return;
        }
        const layout = layoutDraftByRoomIdRef.current[dragState.roomId];
        if (layout) {
          persistRoomLayout(dragState.roomId, layout);
        }
        if (dragState.hasCrossedThreshold) {
          recentHandleDragAtRef.current = Date.now();
        }
      } else {
        if (!dragState.hasCrossedThreshold) {
          setDragState(null);
          return;
        }
        const layout = layoutDraftByRoomIdRef.current[dragState.roomId];
        if (layout) {
          persistRoomLayout(dragState.roomId, layout);
        }
      }
      setDragState(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState, structureScale]);

  function startInlineCreate(elementType: StructureElementType = "room") {
    if (!canWrite) {
      return;
    }

    const layout = layoutFromPoints(
      rectPolygonPoints(
        CANVAS_GRID_PITCH + (rooms.length % 5) * 200,
        CANVAS_GRID_PITCH + Math.floor(rooms.length / 5) * 150,
        CANVAS_GRID_SIZE * 8,
        CANVAS_GRID_SIZE * 5
      )
    );
    const usedNames = new Set(rooms.map((room) => room.name.toLowerCase()));
    const usedSlugs = new Set(effectiveSpaces.map((candidate) => candidate.slug));
    const baseName = "New Space";
    let nextName = baseName;
    let nameCounter = 2;
    while (usedNames.has(nextName.toLowerCase())) {
      nextName = `${baseName} ${nameCounter}`;
      nameCounter += 1;
    }

    const baseSlug = slugify(nextName);
    let nextSlug = baseSlug;
    let slugCounter = 2;
    while (usedSlugs.has(nextSlug)) {
      nextSlug = `${baseSlug}-${slugCounter}`;
      slugCounter += 1;
    }

    const created = createSpaceOptimistically({
      parentSpaceId: mappingRoot.id,
      name: nextName,
      slug: nextSlug,
      spaceKind: toSpaceKind(elementType),
      status: "open",
      isBookable: isNonBookableElementType(elementType) ? false : true,
      timezone: mappingRoot.timezone,
      capacity: null,
      sortIndex: rooms.length,
      metadataJson: {
        floorPlan: {
          ...polygonToFloorPlanPatch(layout.points, {}, layout.smoothPoints),
          elementType
        }
      }
    });

    openEditRoomPanel(created);
    setHoveredRoomId(null);
  }

  function openEditRoomPanel(room: FacilitySpace) {
    const draft: SpaceEditorDraft = {
      mode: "edit",
      spaceId: room.id,
      name: room.name,
      slug: room.slug,
      elementType: resolveElementType(room),
      status: room.status,
      isBookable: room.isBookable,
      timezone: room.timezone,
      capacity: room.capacity === null ? "" : String(room.capacity)
    };
    setActiveRoomId(room.id);
    setSelectedRoomIds([room.id]);
    setSpaceEditorDraft(draft);
    setSpaceEditorInitialDraft(draft);
    setEditorTab("general");
    setEditorError(null);
  }

  function submitNodeEditor() {
    if (!canWrite || !activeEditorDraft || !activeEditorDraft.spaceId) {
      return false;
    }

    const room = spaceById.get(activeEditorDraft.spaceId);
    if (!room) {
      return false;
    }

    const name = activeEditorDraft.name.trim();
    if (name.length < 2) {
      setEditorTab("general");
      setEditorError("Name must be at least 2 characters.");
      return false;
    }

    const existingMetadata = room ? asObject(room.metadataJson) : {};
    const floorPlan = asObject(existingMetadata.floorPlan);
    const layout = layoutDraftByRoomId[room.id] ?? getRoomLayout(room, 0);
    const parsedCapacity = activeEditorDraft.capacity ? Number.parseInt(activeEditorDraft.capacity, 10) : null;
    const capacity = Number.isFinite(parsedCapacity) ? Math.max(0, parsedCapacity ?? 0) : room.capacity;
    updateSpaceOptimistically({
      spaceId: activeEditorDraft.spaceId,
      parentSpaceId: room.parentSpaceId,
      name,
      slug: activeEditorDraft.slug || slugify(name),
      spaceKind: toSpaceKind(activeEditorDraft.elementType),
      status: activeEditorDraft.status,
      isBookable: isNonBookableElementType(activeEditorDraft.elementType) ? false : activeEditorDraft.isBookable,
      timezone: activeEditorDraft.timezone || room.timezone,
      capacity,
      sortIndex: room.sortIndex,
      metadataJson: {
        ...existingMetadata,
        floorPlan: {
          ...polygonToFloorPlanPatch(layout.points, floorPlan, layout.smoothPoints),
          elementType: activeEditorDraft.elementType
        }
      }
    });
    setEditorError(null);
    const nextDraft = { ...activeEditorDraft, name, capacity: capacity === null ? "" : String(capacity) };
    setSpaceEditorDraft(nextDraft);
    setSpaceEditorInitialDraft(nextDraft);
    return true;
  }

  function focusRoomFromSearch(query: string) {
    const normalizedQuery = normalizeSearchKey(query.trim());
    if (!normalizedQuery) {
      return;
    }

    const exact = matchingRooms.find((room) => normalizeSearchKey(room.name) === normalizedQuery);
    const target = exact ?? matchingRooms[0];
    if (!target) {
      return;
    }

    setActiveRoomId(target.id);
    setSelectedRoomIds([target.id]);
    const node = document.querySelector(`[data-structure-node-id="${target.id}"]`);
    if (node instanceof HTMLElement) {
      structureCanvasRef.current?.focusElement(node, { targetScale: 1.3 });
    }
    openEditRoomPanel(target);
  }

  function duplicateRoomWithOffset(room: FacilitySpace, offsetMultiplier = 1) {
    if (!canWrite) {
      return;
    }

    const roomLayout = layoutDraftByRoomId[room.id] ?? getRoomLayout(room, 0);
    const metadata = asObject(room.metadataJson);
    const floorPlan = asObject(metadata.floorPlan);
    const usedNames = new Set(rooms.map((candidate) => candidate.name.toLowerCase()));
    const usedSlugs = new Set(effectiveSpaces.map((candidate) => candidate.slug));
    const baseName = `${room.name} Copy`;
    const baseSlug = `${room.slug || slugify(room.name)}-copy`;
    let nextName = baseName;
    let counter = 2;
    while (usedNames.has(nextName.toLowerCase())) {
      nextName = `${baseName} ${counter}`;
      counter += 1;
    }

    let nextSlug = baseSlug;
    let slugCounter = 2;
    while (usedSlugs.has(nextSlug)) {
      nextSlug = `${baseSlug}-${slugCounter}`;
      slugCounter += 1;
    }

    const offset = CANVAS_GRID_PITCH * Math.max(1, offsetMultiplier);
    const shiftedPoints = translatePolygon(roomLayout.points, offset, offset).map((point) => ({
      x: snapToGrid(point.x),
      y: snapToGrid(point.y)
    }));
    createSpaceOptimistically({
      parentSpaceId: mappingRoot.id,
      name: nextName,
      slug: nextSlug,
      spaceKind: room.spaceKind,
      status: room.status,
      isBookable: room.isBookable,
      timezone: room.timezone,
      capacity: room.capacity,
      sortIndex: rooms.length,
      metadataJson: {
        ...metadata,
        floorPlan: {
          ...polygonToFloorPlanPatch(shiftedPoints, floorPlan, roomLayout.smoothPoints)
        }
      }
    });
  }

  function duplicateRoom(room: FacilitySpace) {
    duplicateRoomWithOffset(room, 1);
  }

  async function deleteRoom(spaceId: string) {
    if (!canWrite) {
      return;
    }

    const target = spaceById.get(spaceId);
    const targetName = target?.name ?? "this space";
    const shouldDelete = await confirm({
      title: "Delete space?",
      description: `Delete ${targetName}? This cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive"
    });
    if (!shouldDelete) {
      return;
    }

    deleteSpaceOptimistically(spaceId);
    if (activeRoomId === spaceId) {
      setActiveRoomId(null);
    }
    setSelectedRoomIds((current) => current.filter((roomId) => roomId !== spaceId));
    if (spaceEditorDraft?.spaceId === spaceId) {
      setSpaceEditorDraft(null);
      setSpaceEditorInitialDraft(null);
    }
  }

  useEffect(() => {
    const shouldIgnoreTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      if (target.isContentEditable) {
        return true;
      }

      return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!mapCanEdit || shouldIgnoreTarget(event.target)) {
        return;
      }

      const activeRoom = activeRoomId ? (spaceById.get(activeRoomId) ?? null) : null;
      const isCopy = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c";
      const isPaste = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v";
      const isDelete = event.key === "Delete" || event.key === "Backspace";

      if (isCopy) {
        if (!activeRoom) {
          return;
        }
        event.preventDefault();
        setCopiedRoomId(activeRoom.id);
        setPasteCount(0);
        return;
      }

      if (isPaste) {
        const sourceId = copiedRoomId ?? activeRoomId;
        if (!sourceId) {
          return;
        }

        const sourceRoom = spaceById.get(sourceId);
        if (!sourceRoom) {
          return;
        }

        event.preventDefault();
        const nextPasteCount = pasteCount + 1;
        duplicateRoomWithOffset(sourceRoom, nextPasteCount);
        setCopiedRoomId(sourceRoom.id);
        setPasteCount(nextPasteCount);
        return;
      }

      if (isDelete && activeRoom) {
        event.preventDefault();
        void deleteRoom(activeRoom.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeRoomId, copiedRoomId, mapCanEdit, pasteCount, spaceById]);

  useEffect(() => {
    if (!dragState) {
      document.body.style.removeProperty("cursor");
      return;
    }

    if (dragState.mode === "move") {
      document.body.style.cursor = "grabbing";
      return () => {
        document.body.style.removeProperty("cursor");
      };
    }

    if (dragState.mode === "vertex" || dragState.mode === "rotate") {
      document.body.style.cursor = "grabbing";
      return () => {
        document.body.style.removeProperty("cursor");
      };
    }
  }, [dragState]);

  function updateEditorDraft(updater: (current: SpaceEditorDraft) => SpaceEditorDraft) {
    setSpaceEditorDraft((current) => {
      if (!current) {
        return current;
      }
      return updater(current);
    });
    setEditorError(null);
  }

  function openVertexDeletePopover(input: { roomId: string; vertexIndex: number; x: number; y: number }) {
    window.dispatchEvent(new CustomEvent("structure-node-actions-open", { detail: { ownerId: "facility-vertex-popover" } }));
    setVertexPopover(input);
  }

  function openRoomActionMenu(input: { roomId: string; x: number; y: number }) {
    window.dispatchEvent(new CustomEvent("structure-node-actions-open", { detail: { ownerId: "facility-room-popover" } }));
    setRoomActionPopover(input);
  }

  function deleteVertexPoint(roomId: string, vertexIndex: number) {
    const layout = layoutDraftByRoomIdRef.current[roomId];
    if (!layout) {
      return;
    }
    if (layout.points.length <= 3) {
      return;
    }
    if (vertexIndex < 0 || vertexIndex >= layout.points.length) {
      return;
    }
    const nextPoints = layout.points.filter((_, index) => index !== vertexIndex);
    if (!isDeletablePolygon(nextPoints)) {
      return;
    }
    const nextSmoothPoints = remapSmoothPointsAfterDelete(layout.smoothPoints, vertexIndex, nextPoints.length);
    const nextLayout = layoutFromPoints(nextPoints, nextSmoothPoints);
    setLayoutDraftByRoomId((current) => {
      const nextState = {
        ...current,
        [roomId]: nextLayout
      };
      layoutDraftByRoomIdRef.current = nextState;
      return nextState;
    });
    persistRoomLayout(roomId, nextLayout);
    setVertexPopover(null);
  }

  function toggleVertexCurves(roomId: string, vertexIndex: number) {
    const layout = layoutDraftByRoomIdRef.current[roomId];
    if (!layout || layout.points.length < 3) {
      return;
    }
    const pointCount = layout.points.length;
    const normalizedIndex = ((vertexIndex % pointCount) + pointCount) % pointCount;
    const hasSmooth = layout.smoothPoints.includes(normalizedIndex);
    const nextSmoothPoints = hasSmooth
      ? layout.smoothPoints.filter((index) => index !== normalizedIndex)
      : normalizeSmoothPoints([...layout.smoothPoints, normalizedIndex], pointCount);
    const nextLayout = layoutFromPoints(layout.points, nextSmoothPoints);
    setLayoutDraftByRoomId((current) => {
      const nextState = {
        ...current,
        [roomId]: nextLayout
      };
      layoutDraftByRoomIdRef.current = nextState;
      return nextState;
    });
    persistRoomLayout(roomId, nextLayout);
  }

  function closeEditor() {
    setSpaceEditorDraft(null);
    setSpaceEditorInitialDraft(null);
    setEditorError(null);
  }

  function handleEditorSave() {
    if (!activeEditorDraft || isMutating) {
      return;
    }
    const saved = submitNodeEditor();
    if (saved) {
      closeEditor();
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-6">
          <CardTitle>Facility structure</CardTitle>
          <CardDescription>Top-down space planning for rooms, zones, and bookable layout mapping.</CardDescription>
        </CardHeader>
        <CardContent>
            <div onPointerDownCapture={handleCanvasPointerDownCapture}>
              <StructureCanvas
                addButtonAriaLabel="Add space"
                addButtonDisabled={!canWrite}
                autoFitKey={
                  autoFitSignature || `rooms:${rooms.length}`
                }
                autoFitOnOpen
                canvasRef={structureCanvasRef}
                dragInProgress={Boolean(dragState)}
                editContent={
                  <>
                    {rooms.map((room) => {
                      const layout = roundLayout(layoutDraftByRoomId[room.id] ?? getRoomLayout(room, 0));
                      const isActive = activeRoomId === room.id;
                      const isSelected = selectedRoomIdSet.has(room.id);
                      const isDraggingThisRoom = Boolean(
                        dragState &&
                          (dragState.mode === "move" ? dragState.roomIds.includes(room.id) : dragState.roomId === room.id)
                      );
                      const isHovered = hoveredRoomId === room.id;
                      const showControls = mapCanEdit && isActive;
                      const elementType = resolveElementType(room);
                      const isStructuralElement = elementType === "structure";
                      const localPolygonPoints = layout.points.map((point) => ({
                        x: point.x - layout.x,
                        y: point.y - layout.y
                      }));
                      const localCentroid = getPolygonCentroid(localPolygonPoints);
                      const roundedCornerRadius = 12;
                      const roundedPath = buildRoundedPolygonPath(localPolygonPoints, roundedCornerRadius, layout.smoothPoints);
                      const centerX = layout.x + layout.width / 2;
                      const centerY = layout.y + layout.height / 2;
                      const getWorldPointFromMouse = (event: React.MouseEvent<HTMLDivElement>) => {
                        const rect = event.currentTarget.getBoundingClientRect();
                        const localX = event.clientX - rect.left;
                        const localY = event.clientY - rect.top;
                        return {
                          x: layout.x + (localX / Math.max(1, rect.width)) * layout.width,
                          y: layout.y + (localY / Math.max(1, rect.height)) * layout.height
                        };
                      };
                      const spaceStatusChip = resolveFacilitySpaceStatusChip(room.status);
                      const nodeStateChip = resolveFacilityNodeStateChip(elementType, room.isBookable);
                      const outlineStroke = isActive
                        ? "hsl(var(--accent))"
                        : isSelected
                          ? "hsl(var(--accent) / 0.65)"
                          : "hsl(var(--border))";
                      const fillColor = isStructuralElement
                        ? "hsl(var(--surface) / 0.7)"
                        : isSelected && !isActive
                          ? "hsl(var(--accent) / 0.08)"
                          : "hsl(var(--surface))";
                      const outlineFilter = isDraggingThisRoom
                        ? "drop-shadow(0 6px 12px hsl(var(--foreground) / 0.14))"
                        : isHovered || isActive
                          ? "drop-shadow(0 4px 10px hsl(var(--foreground) / 0.11))"
                          : "drop-shadow(0 1px 2px hsl(var(--foreground) / 0.08))";

                      return (
                        <StructureNode
                          chromeless
                          centerContent
                          chipsAboveTitle
                          centerContentPosition={{
                            left: `${(localCentroid.x / Math.max(1, layout.width)) * 100}%`,
                            top: `${(localCentroid.y / Math.max(1, layout.height)) * 100}%`
                          }}
                          className={`group ${showControls ? "pointer-events-auto" : "pointer-events-none"} absolute ${isDraggingThisRoom ? "transition-none" : ""}`}
                          chips={null}
                          conflicted={false}
                          focused={false}
                          movementLocked={!mapCanEdit}
                          nodeId={room.id}
                          key={room.id}
                          style={{
                            left: `${layout.x}px`,
                            top: `${layout.y}px`,
                            width: `${layout.width}px`,
                            height: `${layout.height}px`,
                            zIndex: isActive ? 20 : 1,
                            cursor: isDraggingThisRoom ? "grabbing" : mapCanEdit ? "grab" : "default"
                          }}
                          structural={isStructuralElement}
                          title={room.name}
                        >
                          <div className="pointer-events-none absolute inset-0 z-[0]" aria-hidden="true">
                            <svg
                              className="h-full w-full"
                              style={{ overflow: "visible" }}
                              viewBox={`0 0 ${Math.max(1, layout.width)} ${Math.max(1, layout.height)}`}
                            >
                              <path
                                className="pointer-events-auto"
                                d={roundedPath}
                                fill="transparent"
                                onClick={(event) => {
                                  if (!mapCanEdit) {
                                    return;
                                  }
                                  event.stopPropagation();
                                  setVertexPopover(null);
                                  if (event.shiftKey) {
                                    return;
                                  }
                                  setActiveRoomId(room.id);
                                  setSelectedRoomIds([room.id]);
                                }}
                                onDoubleClick={(event) => {
                                  if (!mapCanEdit) {
                                    return;
                                  }
                                  event.preventDefault();
                                  event.stopPropagation();
                                  openRoomActionMenu({
                                    roomId: room.id,
                                    x: event.clientX + 10,
                                    y: event.clientY + 10
                                  });
                                }}
                                onPointerDown={(event) => {
                                  if (!mapCanEdit || event.button !== 0) {
                                    return;
                                  }
                                  event.stopPropagation();
                                  const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                                  if (!rect) {
                                    return;
                                  }
                                  const localX = event.clientX - rect.left;
                                  const localY = event.clientY - rect.top;
                                  const worldPoint = {
                                    x: layout.x + (localX / Math.max(1, rect.width)) * layout.width,
                                    y: layout.y + (localY / Math.max(1, rect.height)) * layout.height
                                  };
                                  const insertCandidate = showControls ? getEdgeInsertCandidate(worldPoint, layout.points) : null;
                                  if (insertCandidate) {
                                    const insertIndex = insertCandidate.edgeIndex + 1;
                                    const insertedPoints = [
                                      ...layout.points.slice(0, insertIndex),
                                      { x: snapToGrid(insertCandidate.x), y: snapToGrid(insertCandidate.y) },
                                      ...layout.points.slice(insertIndex)
                                    ];
                                    if (isEditablePolygon(insertedPoints)) {
                                      const insertedSmoothPoints = remapSmoothPointsAfterInsert(layout.smoothPoints, insertCandidate.edgeIndex);
                                      const insertedLayout = layoutFromPoints(insertedPoints, insertedSmoothPoints);
                                      setLayoutDraftByRoomId((current) => {
                                        const nextState = {
                                          ...current,
                                          [room.id]: insertedLayout
                                        };
                                        layoutDraftByRoomIdRef.current = nextState;
                                        return nextState;
                                      });
                                      persistRoomLayout(room.id, insertedLayout);
                                      setEdgeInsertHover({
                                        roomId: room.id,
                                        edgeIndex: insertCandidate.edgeIndex,
                                        x: insertedPoints[insertIndex].x,
                                        y: insertedPoints[insertIndex].y
                                      });
                                    }
                                    return;
                                  }
                                  setActiveRoomId(room.id);
                                  const shiftSelection = event.shiftKey
                                    ? selectedRoomIdSet.has(room.id)
                                      ? selectedRoomIds
                                      : [...selectedRoomIds, room.id]
                                    : null;
                                  const moveRoomIds =
                                    shiftSelection && shiftSelection.length > 1
                                      ? shiftSelection
                                      : selectedRoomIdSet.has(room.id) && selectedRoomIds.length > 0
                                        ? selectedRoomIds
                                        : [room.id];
                                  const originsByRoomId: Record<string, RoomLayout> = {};
                                  for (const moveRoomId of moveRoomIds) {
                                    const originLayout = layoutDraftByRoomIdRef.current[moveRoomId];
                                    if (originLayout) {
                                      originsByRoomId[moveRoomId] = originLayout;
                                    }
                                  }
                                  if (shiftSelection) {
                                    setSelectedRoomIds(shiftSelection);
                                  } else if (!selectedRoomIdSet.has(room.id)) {
                                    setSelectedRoomIds([room.id]);
                                  }
                                  setDragState({
                                    mode: "move",
                                    roomId: room.id,
                                    roomIds: moveRoomIds,
                                    startX: event.clientX,
                                    startY: event.clientY,
                                    origin: layout,
                                    originsByRoomId,
                                    originLeft: layout.x,
                                    originTop: layout.y,
                                    snappedDeltaX: 0,
                                    snappedDeltaY: 0,
                                    hasCrossedThreshold: false
                                  });
                                }}
                                onPointerEnter={() => setHoveredRoomId(room.id)}
                                onPointerLeave={() => {
                                  setHoveredRoomId((current) => (current === room.id ? null : current));
                                  setEdgeInsertHover((current) => (current?.roomId === room.id ? null : current));
                                }}
                                onPointerMove={(event) => {
                                  if (!showControls || dragState) {
                                    setEdgeInsertHover((current) => (current?.roomId === room.id ? null : current));
                                    return;
                                  }
                                  const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                                  if (!rect) {
                                    return;
                                  }
                                  const localX = event.clientX - rect.left;
                                  const localY = event.clientY - rect.top;
                                  const worldPoint = {
                                    x: layout.x + (localX / Math.max(1, rect.width)) * layout.width,
                                    y: layout.y + (localY / Math.max(1, rect.height)) * layout.height
                                  };
                                  const candidate = getEdgeInsertCandidate(worldPoint, layout.points);
                                  if (!candidate) {
                                    setEdgeInsertHover((current) => (current?.roomId === room.id ? null : current));
                                    return;
                                  }
                                  setEdgeInsertHover({
                                    roomId: room.id,
                                    edgeIndex: candidate.edgeIndex,
                                    x: candidate.x,
                                    y: candidate.y
                                  });
                                }}
                              />
                              <path
                                className="transition-[filter,fill] duration-100 ease-out"
                                d={roundedPath}
                                fill={fillColor}
                                style={{ filter: outlineFilter }}
                              />
                              <path
                                className="transition-colors duration-100 ease-out"
                                d={roundedPath}
                                fill="transparent"
                                stroke={outlineStroke}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                vectorEffect="non-scaling-stroke"
                              />
                            </svg>
                          </div>
                          {showControls ? (
                            <>
                              {edgeInsertHover && edgeInsertHover.roomId === room.id ? (
                                <span
                                  aria-hidden="true"
                                  className="pointer-events-none absolute z-30 inline-flex h-5 w-5 items-center justify-center rounded-full border border-accent/60 bg-surface text-xs font-semibold text-accent shadow-sm"
                                  style={{
                                    left: `${((edgeInsertHover.x - layout.x) / Math.max(1, layout.width)) * 100}%`,
                                    top: `${((edgeInsertHover.y - layout.y) / Math.max(1, layout.height)) * 100}%`,
                                    transform: `translate(calc(-50% + ${EDGE_INSERT_ICON_OFFSET}px), calc(-50% + ${EDGE_INSERT_ICON_OFFSET}px))`
                                  }}
                                >
                                  +
                                </span>
                              ) : null}
                              {layout.points.map((point, pointIndex) => (
                                <button
                                  aria-label="Drag point"
                                  className="absolute z-30 rounded-full border-2 border-accent bg-surface shadow-sm transition-[transform,background-color] duration-150 ease-out hover:scale-110 hover:bg-accent/25"
                                  key={`vertex:${pointIndex}`}
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                  }}
                                  onDoubleClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    if (!mapCanEdit) {
                                      return;
                                    }
                                    toggleVertexCurves(room.id, pointIndex);
                                  }}
                                  onPointerDown={(event) => {
                                    event.stopPropagation();
                                    if (Date.now() - recentHandleDragAtRef.current < 180) {
                                      return;
                                    }
                                    setActiveRoomId(room.id);
                                    setDragState({
                                      mode: "vertex",
                                      roomId: room.id,
                                      startX: event.clientX,
                                      startY: event.clientY,
                                      vertexIndex: pointIndex,
                                      originPoints: layout.points,
                                      smoothPoints: layout.smoothPoints,
                                      hasCrossedThreshold: false
                                    });
                                  }}
                                  style={{
                                    left: `${((point.x - layout.x) / Math.max(1, layout.width)) * 100}%`,
                                    top: `${((point.y - layout.y) / Math.max(1, layout.height)) * 100}%`,
                                    width: `${HANDLE_SIZE}px`,
                                    height: `${HANDLE_SIZE}px`,
                                    transform: "translate(-50%, -50%)"
                                  }}
                                  type="button"
                                />
                              ))}
                              <button
                                aria-label="Rotate shape"
                                className="absolute z-30 inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-accent bg-surface shadow-sm"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                }}
                                onPointerDown={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  setActiveRoomId(room.id);
                                  const nodeRect = event.currentTarget
                                    .closest("[data-structure-node-id]")
                                    ?.getBoundingClientRect();
                                  const centerClientX = nodeRect ? nodeRect.left + nodeRect.width / 2 : event.clientX;
                                  const centerClientY = nodeRect ? nodeRect.top + nodeRect.height / 2 : event.clientY;
                                  setDragState({
                                    mode: "rotate",
                                    roomId: room.id,
                                    startX: event.clientX,
                                    startY: event.clientY,
                                    originPoints: layout.points,
                                    smoothPoints: layout.smoothPoints,
                                    center: { x: centerX, y: centerY },
                                    centerClientX,
                                    centerClientY,
                                    startAngle: Math.atan2(event.clientY - centerClientY, event.clientX - centerClientX),
                                    hasCrossedThreshold: false
                                  });
                                }}
                                style={{
                                  left: "50%",
                                  top: `-${ROTATE_HANDLE_OFFSET}px`,
                                  transform: "translate(-50%, -50%)"
                                }}
                                type="button"
                              >
                                <RotateCw className="h-3.5 w-3.5" />
                              </button>
                              {vertexPopover && vertexPopover.roomId === room.id ? (
                                <Popover
                                  anchorPoint={{ x: vertexPopover.x, y: vertexPopover.y }}
                                  className="w-auto rounded-full border border-border/70 bg-surface/95 p-1 shadow-floating backdrop-blur"
                                  onClose={() => setVertexPopover(null)}
                                  open
                                  placement="bottom-start"
                                >
                                  <Button
                                    aria-label="Delete point"
                                    disabled={layout.points.length <= 3}
                                    onPointerDown={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      deleteVertexPoint(room.id, vertexPopover.vertexIndex);
                                    }}
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      deleteVertexPoint(room.id, vertexPopover.vertexIndex);
                                    }}
                                    size="sm"
                                    type="button"
                                    variant="ghost"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </Popover>
                              ) : null}
                              {roomActionPopover && roomActionPopover.roomId === room.id ? (
                                <Popover
                                  anchorPoint={{ x: roomActionPopover.x, y: roomActionPopover.y }}
                                  className="w-auto rounded-[999px] border border-border/70 bg-surface/95 p-1 shadow-floating backdrop-blur"
                                  onClose={() => setRoomActionPopover(null)}
                                  open
                                  placement="bottom-start"
                                >
                                  <div className="flex items-center gap-1">
                                    <Button
                                      aria-label="Edit node"
                                      className="h-8 w-8 rounded-full p-0"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setRoomActionPopover(null);
                                        openEditRoomPanel(room);
                                      }}
                                      size="sm"
                                      type="button"
                                      variant="ghost"
                                    >
                                      <Settings2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      aria-label="Duplicate node"
                                      className="h-8 w-8 rounded-full p-0"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setRoomActionPopover(null);
                                        duplicateRoom(room);
                                      }}
                                      size="sm"
                                      type="button"
                                      variant="ghost"
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      aria-label="Delete node"
                                      className="h-8 w-8 rounded-full p-0 text-danger"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setRoomActionPopover(null);
                                        void deleteRoom(room.id);
                                      }}
                                      size="sm"
                                      type="button"
                                      variant="ghost"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </Popover>
                              ) : null}
                            </>
                          ) : null}
                        </StructureNode>
                      );
                    })}
                  </>
                }
                emptyState={rooms.length === 0 ? <Alert variant="info">No mapped spaces yet. Add one to start building this layout.</Alert> : null}
                facilityRootId={mappingRoot.id}
                facilitySpaces={effectiveSpaces}
                mapMode="facility"
                onAdd={() => startInlineCreate("room")}
                onEditOpenChange={setIsStructureCanvasEditMode}
                onFacilitySelect={(space) => {
                  setActiveRoomId(space.id);
                  setSelectedRoomIds([space.id]);
                }}
                onFit={handleFitToRooms}
                onSearchQueryChange={setStructureSearch}
                onSearchSubmit={focusRoomFromSearch}
                onViewNodeSelect={(nodeId) => {
                  setActiveRoomId(nodeId);
                  setSelectedRoomIds([nodeId]);
                }}
                onViewScaleChange={(scale) => {
                  setStructureScale(scale);
                  setStructureZoomPercent(Math.round(scale * 100));
                }}
                persistViewState={false}
                popupSubtitle="Edit structure map, rooms, and layout."
                popupTitle={`Editing map: ${canvasCenterTitle}`}
                rootHeader={null}
                searchInputRef={structureSearchInputRef}
                searchPlaceholder="Search spaces"
                searchQuery={structureSearch}
                searchResults={matchingRooms.map((room) => ({
                  id: room.id,
                  name: room.name,
                  kindLabel: resolveElementType(room)
                }))}
                storageKey={`facility-floorplan-canvas:${orgSlug}:${mappingRoot.id}`}
                canvasLayoutMode="free"
                canvasContentClassName="p-0"
                canvasGridSize={CANVAS_GRID_SIZE}
                canvasGridColor="hsl(var(--border) / 0.55)"
                viewContentInteractive
                viewEditButtonPlacement="top-right"
                viewViewportInteractive
                zoomPercent={structureZoomPercent}
              />
            </div>
          <Popup
            closeOnBackdrop
            contentClassName="p-0"
            footer={
              <>
                {activeEditorDraft?.mode === "edit" && activeEditorDraft.spaceId && canWrite ? (
                  <Button
                    className="mr-auto"
                    disabled={isMutating}
                    onClick={() => {
                      void deleteRoom(activeEditorDraft.spaceId as string);
                    }}
                    type="button"
                    variant="ghost"
                  >
                    Delete
                  </Button>
                ) : null}
                <Button
                  disabled={!canWrite || activeNameInvalid || isMutating}
                  loading={isMutating}
                  onClick={handleEditorSave}
                  type="button"
                  variant="secondary"
                >
                  Save
                </Button>
              </>
            }
            onClose={() => {
              closeEditor();
            }}
            open={isEditorOpen}
            popupClassName="w-[min(1100px,calc(100vw-1.5rem))] max-w-none sm:w-[min(1100px,calc(100vw-3rem))] max-h-[90vh]"
            size="xl"
            subtitle={
              activeEditorDraft
                ? `Facility: ${mappingRoot.name} • ${activeEditorDraft.elementType} • ${activeEditorDraft.status}`
                : undefined
            }
            title={
              <div className="flex items-center gap-2">
                <span>{activeEditorDraft?.name || "Edit Space Node"}</span>
                {activeEditorDraft ? (
                  <Chip
                    className="normal-case tracking-normal"
                    color={resolveFacilitySpaceStatusChip(activeEditorDraft.status).color}
                    size="compact"
                    variant="flat"
                  >
                    {resolveFacilitySpaceStatusChip(activeEditorDraft.status).label}
                  </Chip>
                ) : null}
              </div>
            }
          >
            {activeEditorDraft ? (
              <div className="flex min-h-0 h-full flex-col">
                <div className="sticky top-0 z-10 border-b bg-surface px-5 py-3 md:px-6">
                  <div className="flex flex-wrap gap-2">
                    {editorTabs.map((tab) => {
                      const active = editorTab === tab.key;
                      const hasError = Boolean(tabHasError[tab.key]);
                      return (
                        <button
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                            active ? "border-accent bg-accent/10 text-text" : "border-border bg-surface hover:bg-surface-muted"
                          } ${hasError ? "border-destructive/70 text-destructive" : ""}`}
                          key={tab.key}
                          onClick={() => setEditorTab(tab.key)}
                          type="button"
                        >
                          <span>{tab.label}</span>
                          {hasError ? <span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4 px-5 py-4 md:px-6">
                  <p className="text-xs text-text-muted">{editorTabs.find((tab) => tab.key === editorTab)?.description}</p>
                  {editorError ? <Alert variant="destructive">{editorError}</Alert> : null}

                  {editorTab === "general" ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <FormField label="Name">
                        <Input
                          autoFocus
                          onChange={(event) =>
                            updateEditorDraft((current) => ({
                              ...current,
                              name: event.target.value
                            }))
                          }
                          placeholder="Space name"
                          value={activeEditorDraft.name}
                        />
                      </FormField>
                      <FormField label="Type">
                        <Select
                          onChange={(event) =>
                            updateEditorDraft((current) => {
                              const elementType = event.target.value as StructureElementType;
                              return {
                                ...current,
                                elementType,
                                isBookable: isNonBookableElementType(elementType) ? false : current.isBookable
                              };
                            })
                          }
                          options={[
                            { value: "room", label: "Room" },
                            { value: "court", label: "Court" },
                            { value: "field", label: "Field" },
                            { value: "custom", label: "Custom" },
                            { value: "structure", label: "Structure (non-bookable)" }
                          ]}
                          value={activeEditorDraft.elementType}
                        />
                      </FormField>
                      <FormField label="Label">
                        <Input disabled value={activeEditorDraft.name.trim() || "Set a name to generate a label"} />
                      </FormField>
                      <FormField label="Description">
                        <Input disabled placeholder="No description field in current data model." value="" />
                      </FormField>
                    </div>
                  ) : null}

                  {editorTab === "scheduling" ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <FormField label="Timezone">
                        <Input
                          onChange={(event) => updateEditorDraft((current) => ({ ...current, timezone: event.target.value }))}
                          placeholder="America/Detroit"
                          value={activeEditorDraft.timezone}
                        />
                      </FormField>
                      <FormField label="Booking rules">
                        <Input disabled placeholder="No booking rule fields are currently modeled here." value="" />
                      </FormField>
                    </div>
                  ) : null}

                  {editorTab === "access" ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <FormField label="Status">
                        <Select
                          onChange={(event) =>
                            updateEditorDraft((current) => ({ ...current, status: event.target.value as FacilitySpace["status"] }))
                          }
                          options={[
                            { value: "open", label: "Open" },
                            { value: "closed", label: "Closed" },
                            { value: "archived", label: "Archived" }
                          ]}
                          value={activeEditorDraft.status}
                        />
                      </FormField>
                      <div className="flex items-end">
                        <label className="ui-inline-toggle">
                          <Checkbox
                            checked={isNonBookableElementType(activeEditorDraft.elementType) ? false : activeEditorDraft.isBookable}
                            disabled={isNonBookableElementType(activeEditorDraft.elementType)}
                            onChange={(event) => updateEditorDraft((current) => ({ ...current, isBookable: event.target.checked }))}
                          />
                          Bookable
                        </label>
                      </div>
                    </div>
                  ) : null}

                  {editorTab === "attributes" ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <FormField label="Capacity">
                        <Input
                          inputMode="numeric"
                          onChange={(event) =>
                            updateEditorDraft((current) => ({ ...current, capacity: event.target.value.replace(/[^0-9]/g, "") }))
                          }
                          placeholder="Optional"
                          value={activeEditorDraft.capacity}
                        />
                      </FormField>
                      <FormField label="Custom settings">
                        <Input disabled placeholder="No custom setting fields in current map editor model." value="" />
                      </FormField>
                    </div>
                  ) : null}

                  {editorTab === "relationships" ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <FormField label="Facility context">
                        <Input disabled value={mappingRoot.name} />
                      </FormField>
                      <FormField label="Parent">
                        <Input disabled value={activeSpaceForEditor?.parentSpaceId ?? mappingRoot.id} />
                      </FormField>
                    </div>
                  ) : null}

                  {editorTab === "advanced" ? (
                    <div className="space-y-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <FormField label="Slug">
                          <Input
                            onChange={(event) => updateEditorDraft((current) => ({ ...current, slug: slugify(event.target.value) }))}
                            value={activeEditorDraft.slug}
                          />
                        </FormField>
                        <FormField label="Space ID">
                          <Input disabled value={activeEditorDraft.spaceId ?? "Will be assigned on save"} />
                        </FormField>
                      </div>
                      {activeEditorDraft.spaceId && canWrite ? (
                        <div className="rounded-control border bg-surface-muted/40 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Destructive</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Button
                              disabled={isMutating}
                              onClick={() => {
                                archiveSpaceOptimistically(activeEditorDraft.spaceId as string);
                                setSpaceEditorDraft(null);
                                setSpaceEditorInitialDraft(null);
                              }}
                              size="sm"
                              type="button"
                              variant="ghost"
                            >
                              Archive
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </Popup>
        </CardContent>
      </Card>
    </>
  );
}
