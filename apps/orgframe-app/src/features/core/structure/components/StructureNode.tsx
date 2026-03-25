"use client";

import { Copy, Lock, Settings2, Trash2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@orgframe/ui/primitives/utils";
import { Button } from "@orgframe/ui/primitives/button";
import { Popover } from "@orgframe/ui/primitives/popover";

type PolygonPoint = { x: number; y: number };

function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

export type StructureNodeProps = {
  nodeId?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  chips?: ReactNode;
  appearance?: "default" | "drop";
  shape?: "card" | "polygon";
  capabilityMode?: "static" | "editable";
  polygonPoints?: PolygonPoint[];
  selected?: boolean;
  focused?: boolean;
  conflicted?: boolean;
  structural?: boolean;
  movementLocked?: boolean;
  sizeLocked?: boolean;
  draggable?: boolean;
  dragHandleProps?: {
    attributes?: Record<string, unknown>;
    listeners?: Record<string, unknown>;
  };
  quickActions?: {
    onEdit?: () => void;
    onDuplicate?: () => void;
    onDelete?: () => void;
    canEdit?: boolean;
    canDuplicate?: boolean;
    canDelete?: boolean;
  };
  quickActionsTrigger?: "click" | "doubleClick";
  quickActionsHitTest?: (event: React.MouseEvent<HTMLDivElement>) => boolean;
  forceSingleLine?: boolean;
  chromeless?: boolean;
  centerContent?: boolean;
  chipsAboveTitle?: boolean;
  centerContentPosition?: { left: string; top: string };
  className?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onDoubleClick?: React.MouseEventHandler<HTMLDivElement>;
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
  onPointerEnter?: React.PointerEventHandler<HTMLDivElement>;
  onPointerLeave?: React.PointerEventHandler<HTMLDivElement>;
  onPointerMove?: React.PointerEventHandler<HTMLDivElement>;
  outerRef?: React.Ref<HTMLDivElement>;
  disableQuickActionsTrigger?: boolean;
  children?: ReactNode;
};

export function StructureNode({
  nodeId,
  title,
  subtitle,
  chips,
  appearance = "default",
  shape = "card",
  capabilityMode = "static",
  polygonPoints,
  selected = false,
  focused = false,
  conflicted = false,
  structural = false,
  movementLocked = false,
  sizeLocked = false,
  draggable = false,
  dragHandleProps,
  quickActions,
  quickActionsTrigger = "click",
  quickActionsHitTest,
  forceSingleLine = false,
  chromeless = false,
  centerContent = false,
  chipsAboveTitle = false,
  centerContentPosition,
  className,
  style,
  onClick,
  onDoubleClick,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
  onPointerMove,
  outerRef,
  disableQuickActionsTrigger = false,
  children
}: StructureNodeProps) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const [actionPointer, setActionPointer] = useState<{ x: number; y: number } | null>(null);
  const actionOwnerId = useId();
  const hasQuickActions = Boolean(quickActions && (quickActions.onEdit || quickActions.onDuplicate || quickActions.onDelete));
  const isDropAppearance = appearance === "drop";
  const isPolygonShape = shape === "polygon" && !isDropAppearance;
  const hasCustomNodeChildren = Boolean(children);
  const shouldRenderPolygonSurface = isPolygonShape && !hasCustomNodeChildren;
  const normalizedPolygonPoints = useMemo<PolygonPoint[]>(
    () => {
      const source =
        polygonPoints && polygonPoints.length >= 3
          ? polygonPoints
          : [
              { x: 0.08, y: 0.02 },
              { x: 0.92, y: 0.02 },
              { x: 0.98, y: 0.3 },
              { x: 0.92, y: 0.98 },
              { x: 0.08, y: 0.98 },
              { x: 0.02, y: 0.3 }
            ];
      return source.map((point) => ({
        x: clamp01(point.x),
        y: clamp01(point.y)
      }));
    },
    [polygonPoints]
  );
  const polygonPath = useMemo(() => {
    if (normalizedPolygonPoints.length < 3) {
      return "";
    }
    const first = normalizedPolygonPoints[0];
    const segments = normalizedPolygonPoints.slice(1).map((point) => `L ${point.x * 100} ${point.y * 100}`);
    return `M ${first.x * 100} ${first.y * 100} ${segments.join(" ")} Z`;
  }, [normalizedPolygonPoints]);

  const openQuickActions = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!hasQuickActions) {
      return;
    }
    if (quickActionsHitTest && !quickActionsHitTest(event)) {
      return;
    }
    window.dispatchEvent(new CustomEvent("structure-node-actions-open", { detail: { ownerId: actionOwnerId } }));
    setActionPointer({
      x: Math.round(event.clientX + 10),
      y: Math.round(event.clientY + 10)
    });
    setActionsOpen(true);
  };

  useEffect(() => {
    if (!actionsOpen) {
      return;
    }

    const closeOnExternalOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ ownerId?: string }>).detail;
      if (!detail?.ownerId || detail.ownerId === actionOwnerId) {
        return;
      }
      setActionsOpen(false);
      setActionPointer(null);
    };

    window.addEventListener("structure-node-actions-open", closeOnExternalOpen as EventListener);
    return () => {
      window.removeEventListener("structure-node-actions-open", closeOnExternalOpen as EventListener);
    };
  }, [actionOwnerId, actionsOpen]);

  return (
    <>
      <div
        className={cn(
          chromeless
            ? isPolygonShape
              ? "relative p-0"
              : "relative px-3 py-2"
            : isDropAppearance
              ? "relative border-0 bg-transparent px-2 py-1 transition-[box-shadow,border-color,background-color] duration-100 ease-out"
              : isPolygonShape
                ? "relative border-0 bg-transparent px-3 py-2 transition-[box-shadow,border-color,background-color] duration-100 ease-out"
                : "rounded-control border bg-surface px-3 py-2 shadow-sm transition-[box-shadow,border-color,background-color] duration-100 ease-out",
          "box-border",
          chromeless || isDropAppearance ? "" : "hover:shadow-floating",
          chromeless || isDropAppearance
            ? ""
            : selected
              ? "border-accent bg-accent/10"
              : structural
                ? "border-dashed border-border/80 bg-surface/70"
                : "border-border",
          isDropAppearance ? (selected ? "border-accent bg-accent/20" : "border-border/60") : "",
          chromeless ? "" : focused ? "ring-2 ring-accent/60" : "",
          chromeless ? "" : conflicted ? "border-destructive/70 bg-destructive/10" : "",
          capabilityMode === "editable" ? "cursor-grab" : "",
          className
        )}
        data-canvas-pan-ignore="true"
        data-structure-node-id={nodeId}
        onClick={(event) => {
          onClick?.(event);
          if (!disableQuickActionsTrigger && quickActionsTrigger === "click") {
            openQuickActions(event);
          }
        }}
        onDoubleClick={(event) => {
          onDoubleClick?.(event);
          if (!disableQuickActionsTrigger && quickActionsTrigger === "doubleClick") {
            openQuickActions(event);
          }
        }}
        onPointerDown={onPointerDown}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onPointerMove={onPointerMove}
        ref={(node) => {
          nodeRef.current = node;
          if (!outerRef) {
            return;
          }
          if (typeof outerRef === "function") {
            outerRef(node);
            return;
          }
          (outerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        style={style}
        {...(draggable ? (dragHandleProps?.attributes ?? {}) : {})}
        {...(draggable ? (dragHandleProps?.listeners ?? {}) : {})}
      >
      {shouldRenderPolygonSurface ? (
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 z-[0]" preserveAspectRatio="none" viewBox="0 0 100 100">
          <path
            d={polygonPath}
            fill={
              isDropAppearance
                ? "transparent"
                : conflicted
                ? "hsl(var(--destructive) / 0.12)"
                : selected
                  ? "hsl(var(--accent) / 0.1)"
                  : structural
                    ? "hsl(var(--surface) / 0.7)"
                    : "hsl(var(--surface))"
            }
            stroke={selected ? "hsl(var(--accent))" : "hsl(var(--border))"}
            strokeWidth={1.75}
            strokeDasharray={isDropAppearance ? "5 4" : undefined}
            vectorEffect="non-scaling-stroke"
          />
          {focused ? <path d={polygonPath} fill="none" stroke="hsl(var(--accent) / 0.6)" strokeWidth={3} vectorEffect="non-scaling-stroke" /> : null}
        </svg>
      ) : null}

      {centerContent ? (
        <div
          className="pointer-events-none absolute z-[2]"
          data-canvas-pan-ignore="true"
          style={{
            left: centerContentPosition?.left ?? "50%",
            top: centerContentPosition?.top ?? "50%",
            transform: "translate(-50%, -50%)"
          }}
        >
          <div className="w-max max-w-[110%] rounded-full border border-border/70 bg-surface/95 px-3 py-2 text-center shadow-sm">
            <span className="flex min-w-0 w-full flex-col items-center leading-tight">
              {chips ? (
                <span className={`flex flex-wrap items-center justify-center gap-1 ${chipsAboveTitle ? "mb-1" : ""}`}>{chips}</span>
              ) : null}
              <span className="block min-w-0 max-w-full truncate text-xs font-semibold text-text" title={typeof title === "string" ? title : undefined}>
                {title}
              </span>
              {subtitle ? <span className="block w-full truncate text-[11px] text-text-muted">{subtitle}</span> : null}
            </span>
          </div>
        </div>
      ) : (
        <div className="relative z-[1] min-w-0 text-left" data-canvas-pan-ignore="true">
          {forceSingleLine ? (
            <span className="flex min-w-0 w-full items-center gap-2">
              <span className="min-w-0 truncate text-xs font-semibold text-text" title={typeof title === "string" ? title : undefined}>
                {title}
              </span>
              {chips ? <span className="flex flex-nowrap items-center gap-1 overflow-hidden [&>*]:shrink-0">{chips}</span> : null}
            </span>
          ) : (
            <span className="flex min-w-0 w-full flex-col leading-tight">
              <span className="flex w-full flex-wrap items-center gap-1">
                <span className="min-w-0 max-w-full truncate text-xs font-semibold text-text" title={typeof title === "string" ? title : undefined}>
                  {title}
                </span>
                {chips ? <span className="flex flex-wrap items-center gap-1">{chips}</span> : null}
              </span>
              {subtitle ? <span className="block w-full truncate text-[11px] text-text-muted">{subtitle}</span> : null}
            </span>
          )}
        </div>
      )}

        {(movementLocked || sizeLocked) && !isDropAppearance ? (
          <span className="absolute bottom-1 right-1 inline-flex items-center rounded-control border bg-surface/95 p-1 text-text-muted" aria-label="Locked" title="Locked">
            <Lock className="h-3 w-3" />
          </span>
        ) : null}

        {hasQuickActions ? (
          <>
            <Popover
              anchorPoint={actionPointer}
              anchorRef={nodeRef}
              className="w-auto rounded-[999px] border border-border/70 bg-surface/95 p-1 shadow-floating backdrop-blur animate-in fade-in zoom-in-95 duration-150 ease-out"
              dismissOnAnchorPointerDown
              offset={6}
              onClose={() => {
                setActionsOpen(false);
                setActionPointer(null);
              }}
              open={actionsOpen}
              placement="bottom-start"
            >
              <div className="flex items-center gap-1">
                {quickActions?.onEdit ? (
                  <Button
                    aria-label="Edit node"
                    className="h-8 w-8 rounded-full p-0"
                    disabled={quickActions.canEdit === false}
                    onClick={(event) => {
                      event.stopPropagation();
                      setActionsOpen(false);
                      setActionPointer(null);
                      quickActions.onEdit?.();
                    }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                ) : null}
                {quickActions?.onDuplicate ? (
                  <Button
                    aria-label="Duplicate node"
                    className="h-8 w-8 rounded-full p-0"
                    disabled={quickActions.canDuplicate === false}
                    onClick={(event) => {
                      event.stopPropagation();
                      setActionsOpen(false);
                      setActionPointer(null);
                      quickActions.onDuplicate?.();
                    }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                ) : null}
                {quickActions?.onDelete ? (
                  <Button
                    aria-label="Delete node"
                    className="h-8 w-8 rounded-full p-0 text-destructive"
                    disabled={quickActions.canDelete === false}
                    onClick={(event) => {
                      event.stopPropagation();
                      setActionsOpen(false);
                      setActionPointer(null);
                      quickActions.onDelete?.();
                    }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </Popover>
          </>
        ) : null}

        {children}
      </div>
    </>
  );
}
