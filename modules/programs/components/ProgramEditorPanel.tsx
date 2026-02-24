"use client";

import Link from "next/link";
import { DndContext, PointerSensor, closestCenter, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Building2, CircleCheck, Eye, EyeOff, GripVertical, MoreHorizontal, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CalendarPicker } from "@/components/ui/calendar-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AssetTile } from "@/components/ui/asset-tile";
import { useToast } from "@/components/ui/toast";
import { getOrgAssetPublicUrl } from "@/lib/branding/getOrgAssetPublicUrl";
import { cn } from "@/lib/utils";
import { FormCreatePanel } from "@/modules/forms/components/FormCreatePanel";
import type { OrgForm } from "@/modules/forms/types";
import { saveProgramHierarchyAction, saveProgramScheduleAction, updateProgramAction } from "@/modules/programs/actions";
import type { ProgramNode, ProgramWithDetails } from "@/modules/programs/types";
import { isProgramNodePublished } from "@/modules/programs/utils";

type ProgramEditorPanelProps = {
  orgSlug: string;
  data: ProgramWithDetails;
  forms: OrgForm[];
  canReadForms: boolean;
  canWriteForms: boolean;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function splitDateTimeLocal(value: string) {
  if (!value) {
    return {
      date: "",
      time: ""
    };
  }

  const [datePart = "", timePart = ""] = value.split("T");
  return {
    date: datePart,
    time: timePart.slice(0, 5)
  };
}

function combineDateTimeLocal(date: string, time: string) {
  if (!date) {
    return "";
  }

  return `${date}T${time || "00:00"}`;
}

const ROOT_PARENT_KEY = "__root__";

function parentKey(parentId: string | null) {
  return parentId ?? ROOT_PARENT_KEY;
}

function containerDropId(parentId: string | null) {
  return `container:${parentKey(parentId)}`;
}

function intoDropId(nodeId: string) {
  return `into:${nodeId}`;
}

function parentFromContainerDropId(value: string): string | null | undefined {
  if (!value.startsWith("container:")) {
    return undefined;
  }

  const key = value.slice("container:".length);
  if (!key || key === ROOT_PARENT_KEY) {
    return null;
  }

  return key;
}

function buildNodeGroups(nodes: ProgramNode[]) {
  const groups = new Map<string, ProgramNode[]>();

  for (const node of [...nodes].sort((a, b) => a.sortIndex - b.sortIndex || a.name.localeCompare(b.name))) {
    const key = parentKey(node.parentId);
    const current = groups.get(key) ?? [];
    current.push(node);
    groups.set(key, current);
  }

  return groups;
}

function collectDescendantIds(nodes: ProgramNode[], rootId: string) {
  const childrenByParent = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.parentId) {
      continue;
    }

    const current = childrenByParent.get(node.parentId) ?? [];
    current.push(node.id);
    childrenByParent.set(node.parentId, current);
  }

  const stack = [...(childrenByParent.get(rootId) ?? [])];
  const descendants = new Set<string>();
  while (stack.length > 0) {
    const next = stack.pop();
    if (!next || descendants.has(next)) {
      continue;
    }

    descendants.add(next);
    const nested = childrenByParent.get(next) ?? [];
    for (const childId of nested) {
      stack.push(childId);
    }
  }

  return descendants;
}

function moveNodeInHierarchy(nodes: ProgramNode[], activeId: string, targetParentId: string | null, targetIndex: number): ProgramNode[] | null {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const activeNode = nodeById.get(activeId);
  if (!activeNode) {
    return null;
  }

  if (targetParentId === activeId) {
    return null;
  }

  const descendants = collectDescendantIds(nodes, activeId);
  if (targetParentId && descendants.has(targetParentId)) {
    return null;
  }

  const groups = buildNodeGroups(nodes);
  const sourceKey = parentKey(activeNode.parentId);
  const sourceNodes = [...(groups.get(sourceKey) ?? [])];
  const sourceIndex = sourceNodes.findIndex((node) => node.id === activeId);
  if (sourceIndex < 0) {
    return null;
  }

  sourceNodes.splice(sourceIndex, 1);
  groups.set(sourceKey, sourceNodes);

  const targetKey = parentKey(targetParentId);
  const targetNodes = [...(groups.get(targetKey) ?? [])];
  let resolvedTargetIndex = Math.max(0, Math.min(targetIndex, targetNodes.length));
  if (sourceKey === targetKey && resolvedTargetIndex > sourceIndex) {
    resolvedTargetIndex -= 1;
  }

  targetNodes.splice(resolvedTargetIndex, 0, activeNode);
  groups.set(targetKey, targetNodes);

  const nextById = new Map(nodes.map((node) => [node.id, { ...node }]));
  for (const [key, siblings] of groups.entries()) {
    const resolvedParentId = key === ROOT_PARENT_KEY ? null : key;
    siblings.forEach((node, index) => {
      const next = nextById.get(node.id);
      if (!next) {
        return;
      }

      next.parentId = resolvedParentId;
      next.sortIndex = index;
    });
  }

  return nodes.map((node) => nextById.get(node.id) ?? node);
}

function HierarchyDropZone({ id, active }: { id: string; active: boolean }) {
  const { isOver, setNodeRef } = useDroppable({
    id
  });

  return (
    <div
      className={cn(
        !active && "hidden",
        "rounded-control border border-dashed px-2 py-1.5 text-center text-[11px] text-text-muted transition-colors",
        isOver ? "border-accent bg-accent/10 text-text" : "border-border bg-surface-muted/30"
      )}
      ref={setNodeRef}
    >
      Drop to place here
    </div>
  );
}

function StructureTreeRow({
  node,
  activeNodeId,
  disabled,
  isPublished,
  onDelete,
  onAddChild,
  onEdit,
  onTogglePublished,
  children
}: {
  node: ProgramNode;
  activeNodeId: string | null;
  disabled: boolean;
  isPublished: boolean;
  onDelete: (nodeId: string) => void;
  onAddChild: (parentNodeId: string, nodeKind: ProgramNode["nodeKind"]) => void;
  onEdit: (node: ProgramNode) => void;
  onTogglePublished: (node: ProgramNode) => void;
  children: ReactNode;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
    disabled
  });
  const { isOver: isIntoOver, setNodeRef: setIntoRef } = useDroppable({
    id: intoDropId(node.id),
    disabled
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };
  const showDropHints = Boolean(activeNodeId && activeNodeId !== node.id);
  const nodeTypeLabel = node.nodeKind === "team" ? "Team" : "Division";
  return (
    <div className="flex w-full flex-col items-center">
      <div
        className={cn(
          "w-full rounded-control border bg-surface px-2 py-1 shadow-sm transition-shadow",
          isDragging && "shadow-card opacity-80",
          isIntoOver && "border-accent bg-accent/5"
        )}
        ref={setNodeRef}
        style={style}
      >
        <div className="flex items-start justify-between gap-1">
          <button
            aria-label="Open node actions"
            className="h-6 w-6 rounded-control border border-border bg-surface-muted text-text-muted hover:bg-surface hover:text-text"
            disabled={disabled}
            onClick={() => setIsMenuOpen((current) => !current)}
            type="button"
          >
            <MoreHorizontal className="mx-auto h-3.5 w-3.5" />
          </button>
          <button
            aria-label={`Drag ${node.name}`}
            className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center text-text-muted hover:text-text"
            disabled={disabled}
            type="button"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3 w-3" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <CircleCheck aria-label={isPublished ? "Published" : "Not published"} className={cn("h-3.5 w-3.5 shrink-0", isPublished ? "text-emerald-500" : "text-text-muted")} />
              <span className="rounded-full border border-border bg-surface-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-text-muted">
                {nodeTypeLabel}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs font-semibold text-text">{node.name}</p>
            <p className="truncate text-[10px] text-text-muted">{node.slug}</p>
          </div>
          {isMenuOpen ? (
            <div className="absolute right-0 top-8 z-20 w-44 rounded-control border bg-surface p-2 shadow-floating">
              <div className="space-y-1">
                <Button
                  className="w-full justify-start"
                  onClick={() => {
                    onTogglePublished(node);
                    setIsMenuOpen(false);
                  }}
                  size="sm"
                  type="button"
                  variant={isPublished ? "secondary" : "primary"}
                >
                  {isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {isPublished ? "Unpublish" : "Publish"}
                </Button>
                <Button
                  className="w-full justify-start"
                  onClick={() => {
                    onEdit(node);
                    setIsMenuOpen(false);
                  }}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit details
                </Button>
                <Button
                  className="w-full justify-start"
                  onClick={() => {
                    onDelete(node.id);
                    setIsMenuOpen(false);
                  }}
                  size="sm"
                  type="button"
                  variant="destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          ) : null}
        </div>
        <div className={cn("pt-2", showDropHints ? "block" : "hidden")}>
          <div
            className={cn(
              "rounded-control border border-dashed px-2 py-1.5 text-center text-[11px] text-text-muted transition-colors",
              isIntoOver ? "border-accent bg-accent/10 text-text" : "border-border bg-surface-muted/30"
            )}
            ref={setIntoRef}
          >
            Drop here to nest under {node.name}
          </div>
        </div>
      </div>
      <div className="relative mt-1">
        <Button
          aria-label="Add child node"
          className="h-7 w-7 px-0"
          disabled={disabled}
          onClick={() => setIsAddMenuOpen((current) => !current)}
          size="sm"
          type="button"
          variant="secondary"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
        {isAddMenuOpen ? (
          <div className="absolute left-1/2 top-8 z-20 w-44 -translate-x-1/2 rounded-control border bg-surface p-2 shadow-floating">
            <div className="space-y-1">
              <Button
                className="w-full justify-start"
                disabled={node.nodeKind === "team"}
                onClick={() => {
                  onAddChild(node.id, "division");
                  setIsAddMenuOpen(false);
                }}
                size="sm"
                type="button"
                variant="secondary"
              >
                <Building2 className="h-3.5 w-3.5" />
                Add division
              </Button>
              <Button
                className="w-full justify-start"
                onClick={() => {
                  onAddChild(node.id, "team");
                  setIsAddMenuOpen(false);
                }}
                size="sm"
                type="button"
                variant="secondary"
              >
                <Users className="h-3.5 w-3.5" />
                Add team
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function ProgramEditorPanel({ orgSlug, data, forms: initialForms, canReadForms, canWriteForms }: ProgramEditorPanelProps) {
  const { toast } = useToast();
  const [isSavingProgram, startSavingProgram] = useTransition();
  const [isMutatingNodes, startMutatingNodes] = useTransition();
  const [isMutatingSchedule, startMutatingSchedule] = useTransition();
  const [isProgramSettingsOpen, setIsProgramSettingsOpen] = useState(false);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [isDivisionCreateOpen, setIsDivisionCreateOpen] = useState(false);
  const [isRootMenuOpen, setIsRootMenuOpen] = useState(false);
  const [isNodeEditOpen, setIsNodeEditOpen] = useState(false);
  const [activeDragNodeId, setActiveDragNodeId] = useState<string | null>(null);
  const [nodes, setNodes] = useState(data.nodes);
  const [scheduleBlocks, setScheduleBlocks] = useState(data.scheduleBlocks);
  const [savedSlug, setSavedSlug] = useState(data.program.slug);

  const [name, setName] = useState(data.program.name);
  const [slug, setSlug] = useState(data.program.slug);
  const [description, setDescription] = useState(data.program.description ?? "");
  const [programType, setProgramType] = useState(data.program.programType);
  const [customTypeLabel, setCustomTypeLabel] = useState(data.program.customTypeLabel ?? "");
  const [status, setStatus] = useState(data.program.status);
  const [startDate, setStartDate] = useState(data.program.startDate ?? "");
  const [endDate, setEndDate] = useState(data.program.endDate ?? "");
  const [coverImagePath, setCoverImagePath] = useState(data.program.coverImagePath ?? "");

  const [nodeName, setNodeName] = useState("");
  const [nodeSlug, setNodeSlug] = useState("");
  const [nodeKind, setNodeKind] = useState<"division" | "team">("division");
  const [parentId, setParentId] = useState<string>("");
  const [capacity, setCapacity] = useState("");
  const [waitlistEnabled, setWaitlistEnabled] = useState(true);
  const [editingNodeId, setEditingNodeId] = useState("");
  const [editingNodeName, setEditingNodeName] = useState("");
  const [editingNodeSlug, setEditingNodeSlug] = useState("");
  const [editingNodeKind, setEditingNodeKind] = useState<"division" | "team">("division");
  const [editingCapacity, setEditingCapacity] = useState("");
  const [editingWaitlistEnabled, setEditingWaitlistEnabled] = useState(true);
  const [editingPublished, setEditingPublished] = useState(true);

  const [scheduleType, setScheduleType] = useState<"date_range" | "meeting_pattern" | "one_off">("date_range");
  const [scheduleTitle, setScheduleTitle] = useState("");
  const [scheduleNodeId, setScheduleNodeId] = useState("");
  const [scheduleStartDate, setScheduleStartDate] = useState("");
  const [scheduleEndDate, setScheduleEndDate] = useState("");
  const [scheduleStartTime, setScheduleStartTime] = useState("");
  const [scheduleEndTime, setScheduleEndTime] = useState("");
  const [scheduleByDay, setScheduleByDay] = useState("");
  const [scheduleOneOffAt, setScheduleOneOffAt] = useState("");
  const scheduleOneOffParts = splitDateTimeLocal(scheduleOneOffAt);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6
      }
    })
  );

  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const nodeGroups = useMemo(() => buildNodeGroups(nodes), [nodes]);
  const linkedForms = useMemo(() => initialForms.filter((form) => form.programId === data.program.id), [initialForms, data.program.id]);

  const parentOptions = useMemo(
    () => [
      { value: "", label: "(Program root)" },
      ...nodes.map((node) => ({
        value: node.id,
        label: `${node.name} (${node.nodeKind})`
      }))
    ],
    [nodes]
  );

  async function handleProgramSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startSavingProgram(async () => {
      const result = await updateProgramAction({
        orgSlug,
        programId: data.program.id,
        slug,
        name,
        description,
        programType,
        customTypeLabel,
        status,
        startDate,
        endDate,
        coverImagePath,
        registrationOpenAt: data.program.registrationOpenAt ?? undefined,
        registrationCloseAt: data.program.registrationCloseAt ?? undefined
      });

      if (!result.ok) {
        toast({
          title: "Unable to save program",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Program saved",
        variant: "success"
      });
      setSavedSlug(slug);
      setIsProgramSettingsOpen(false);
    });
  }

  function handleNodeCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const resolvedSlug = nodeSlug || slugify(nodeName);
    if (!resolvedSlug) {
      toast({
        title: "Missing node slug",
        variant: "destructive"
      });
      return;
    }

    startMutatingNodes(async () => {
      const result = await saveProgramHierarchyAction({
        orgSlug,
        programId: data.program.id,
        action: "create",
        parentId: parentId || null,
        name: nodeName,
        slug: resolvedSlug,
        nodeKind,
        capacity: capacity ? Number.parseInt(capacity, 10) : null,
        waitlistEnabled
      });

      if (!result.ok) {
        toast({
          title: "Unable to add node",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      setNodeName("");
      setNodeSlug("");
      setParentId("");
      setCapacity("");
      setNodeKind("division");
      setWaitlistEnabled(true);
      setNodes(result.data.details.nodes);
      setScheduleBlocks(result.data.details.scheduleBlocks);
      setIsDivisionCreateOpen(false);
      toast({ title: "Node added", variant: "success" });
    });
  }

  function handleNodeDelete(nodeId: string) {
    startMutatingNodes(async () => {
      const result = await saveProgramHierarchyAction({
        orgSlug,
        programId: data.program.id,
        action: "delete",
        nodeId
      });

      if (!result.ok) {
        toast({
          title: "Unable to delete node",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      toast({ title: "Node deleted", variant: "success" });
      setNodes(result.data.details.nodes);
      setScheduleBlocks(result.data.details.scheduleBlocks);
    });
  }

  function openNodeEditPanel(node: ProgramNode) {
    setEditingNodeId(node.id);
    setEditingNodeName(node.name);
    setEditingNodeSlug(node.slug);
    setEditingNodeKind(node.nodeKind);
    setEditingCapacity(node.capacity?.toString() ?? "");
    setEditingWaitlistEnabled(node.waitlistEnabled);
    setEditingPublished(isProgramNodePublished(node));
    setIsNodeEditOpen(true);
  }

  function handleNodeEditSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const resolvedSlug = editingNodeSlug || slugify(editingNodeName);
    if (!resolvedSlug) {
      toast({
        title: "Missing node slug",
        variant: "destructive"
      });
      return;
    }

    startMutatingNodes(async () => {
      const result = await saveProgramHierarchyAction({
        orgSlug,
        programId: data.program.id,
        action: "update",
        nodeId: editingNodeId,
        name: editingNodeName,
        slug: resolvedSlug,
        nodeKind: editingNodeKind,
        capacity: editingCapacity ? Number.parseInt(editingCapacity, 10) : null,
        waitlistEnabled: editingWaitlistEnabled,
        isPublished: editingPublished
      });

      if (!result.ok) {
        toast({
          title: "Unable to save node",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      setNodes(result.data.details.nodes);
      setScheduleBlocks(result.data.details.scheduleBlocks);
      setIsNodeEditOpen(false);
      toast({ title: "Node updated", variant: "success" });
    });
  }

  function handleNodePublishToggle(node: ProgramNode) {
    const isPublished = isProgramNodePublished(node);

    startMutatingNodes(async () => {
      const result = await saveProgramHierarchyAction({
        orgSlug,
        programId: data.program.id,
        action: "set-published",
        nodeId: node.id,
        isPublished: !isPublished
      });

      if (!result.ok) {
        toast({
          title: isPublished ? "Unable to unpublish node" : "Unable to publish node",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: isPublished ? "Node unpublished" : "Node published",
        variant: "success"
      });
      setNodes(result.data.details.nodes);
      setScheduleBlocks(result.data.details.scheduleBlocks);
    });
  }

  function openNodeCreatePanel(parentNodeId: string | null = null, nextNodeKind: ProgramNode["nodeKind"] = "division") {
    setNodeName("");
    setNodeSlug("");
    setCapacity("");
    setWaitlistEnabled(true);
    setParentId(parentNodeId ?? "");
    setNodeKind(nextNodeKind);
    setIsDivisionCreateOpen(true);
  }

  function handleNodeDragStart(event: DragStartEvent) {
    setActiveDragNodeId(String(event.active.id));
  }

  function handleNodeDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    setActiveDragNodeId(null);

    if (!overId || isMutatingNodes) {
      return;
    }

    let targetParentId: string | null = null;
    let targetIndex = 0;

    if (overId.startsWith("into:")) {
      targetParentId = overId.slice("into:".length) || null;
      const siblings = nodeGroups.get(parentKey(targetParentId)) ?? [];
      targetIndex = siblings.length;
    } else {
      const containerParent = parentFromContainerDropId(overId);
      if (containerParent !== undefined) {
        targetParentId = containerParent;
        const siblings = nodeGroups.get(parentKey(targetParentId)) ?? [];
        targetIndex = siblings.length;
      } else {
        const overNode = nodeById.get(overId);
        if (!overNode) {
          return;
        }

        targetParentId = overNode.parentId;
        const siblings = nodeGroups.get(parentKey(targetParentId)) ?? [];
        targetIndex = siblings.findIndex((sibling) => sibling.id === overNode.id);
        if (targetIndex < 0) {
          targetIndex = siblings.length;
        }
      }
    }

    const nextNodes = moveNodeInHierarchy(nodes, activeId, targetParentId, targetIndex);
    if (!nextNodes) {
      toast({
        title: "Invalid move",
        description: "A structure node cannot be moved into itself or one of its descendants.",
        variant: "destructive"
      });
      return;
    }

    const previousNodes = nodes;
    const hasChanged = nextNodes.some((node, index) => {
      const previous = previousNodes[index];
      return previous.parentId !== node.parentId || previous.sortIndex !== node.sortIndex || previous.nodeKind !== node.nodeKind;
    });

    if (!hasChanged) {
      return;
    }

    setNodes(nextNodes);
    startMutatingNodes(async () => {
      const result = await saveProgramHierarchyAction({
        orgSlug,
        programId: data.program.id,
        action: "reorder",
        nodes: nextNodes.map((node) => ({
          nodeId: node.id,
          parentId: node.parentId,
          sortIndex: node.sortIndex,
          nodeKind: node.nodeKind
        }))
      });

      if (!result.ok) {
        setNodes(previousNodes);
        toast({
          title: "Unable to move node",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      setNodes(result.data.details.nodes);
      setScheduleBlocks(result.data.details.scheduleBlocks);
      toast({
        title: "Hierarchy updated",
        variant: "success"
      });
    });
  }

  function renderStructureBranch(parentId: string | null): ReactNode {
    const siblings = nodeGroups.get(parentKey(parentId)) ?? [];
    const showDropZone = Boolean(activeDragNodeId);
    const showConnectorLine = siblings.length > 1;
    const rowGapPx = 12;
    const siblingCount = Math.max(1, siblings.length);
    const siblingWidth = `calc((100% - ${(siblingCount - 1) * rowGapPx}px) / ${siblingCount})`;

    if (siblings.length === 0 && !showDropZone) {
      return null;
    }

    return (
      <div className="mt-3 flex w-full flex-col items-center">
        {siblings.length > 0 ? <div className="h-4 w-px bg-border" /> : null}
        {siblings.length > 0 ? (
          <div className="relative flex w-full flex-nowrap justify-center gap-3 pt-4">
            {showConnectorLine ? <div className="absolute left-8 right-8 top-0 h-px bg-border" /> : null}
            <SortableContext items={siblings.map((node) => node.id)} strategy={rectSortingStrategy}>
              {siblings.map((node) => (
                <div className="relative flex shrink-0 flex-col items-stretch" key={node.id} style={{ width: siblingWidth, minWidth: "56px" }}>
                  <div className="absolute -top-4 left-1/2 h-4 w-px -translate-x-1/2 bg-border" />
                  <StructureTreeRow
                    activeNodeId={activeDragNodeId}
                    disabled={isMutatingNodes}
                    isPublished={isProgramNodePublished(node)}
                    node={node}
                    onAddChild={openNodeCreatePanel}
                    onDelete={handleNodeDelete}
                    onEdit={openNodeEditPanel}
                    onTogglePublished={handleNodePublishToggle}
                  >
                    {renderStructureBranch(node.id)}
                  </StructureTreeRow>
                </div>
              ))}
            </SortableContext>
          </div>
        ) : null}
        <div className="mt-2 w-full">
          <HierarchyDropZone active={showDropZone} id={containerDropId(parentId)} />
        </div>
      </div>
    );
  }

  function handleScheduleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const byDay = scheduleByDay
      .split(",")
      .map((part) => Number.parseInt(part.trim(), 10))
      .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);

    startMutatingSchedule(async () => {
      const result = await saveProgramScheduleAction({
        orgSlug,
        programId: data.program.id,
        action: "create",
        blockType: scheduleType,
        title: scheduleTitle,
        programNodeId: scheduleNodeId || null,
        startDate: scheduleStartDate,
        endDate: scheduleEndDate,
        startTime: scheduleStartTime,
        endTime: scheduleEndTime,
        byDay: byDay.length > 0 ? byDay : undefined,
        oneOffAt: scheduleOneOffAt || undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });

      if (!result.ok) {
        toast({
          title: "Unable to add schedule block",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      setScheduleTitle("");
      setScheduleNodeId("");
      setScheduleStartDate("");
      setScheduleEndDate("");
      setScheduleStartTime("");
      setScheduleEndTime("");
      setScheduleByDay("");
      setScheduleOneOffAt("");
      setNodes(result.data.details.nodes);
      setScheduleBlocks(result.data.details.scheduleBlocks);
      toast({ title: "Schedule block added", variant: "success" });
    });
  }

  function handleScheduleDelete(scheduleBlockId: string) {
    startMutatingSchedule(async () => {
      const result = await saveProgramScheduleAction({
        orgSlug,
        programId: data.program.id,
        action: "delete",
        scheduleBlockId
      });

      if (!result.ok) {
        toast({
          title: "Unable to delete schedule block",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      toast({ title: "Schedule block deleted", variant: "success" });
      setNodes(result.data.details.nodes);
      setScheduleBlocks(result.data.details.scheduleBlocks);
    });
  }

  function openCreateFormPanel() {
    if (linkedForms.length > 0) {
      return;
    }

    setIsCreateFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Program settings</CardTitle>
          <CardDescription>Configure core program details and publish state in a side panel.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-text-muted">
            <p className="font-medium text-text">{name}</p>
            <p>
              {programType === "custom" ? customTypeLabel || "Custom" : programType} · {status}
            </p>
          </div>
          <Button onClick={() => setIsProgramSettingsOpen(true)} type="button">
            Edit settings
          </Button>
        </CardContent>
      </Card>

      <Panel
        footer={
          <>
            <Button onClick={() => setIsProgramSettingsOpen(false)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button disabled={isSavingProgram} form="program-settings-form" loading={isSavingProgram} type="submit">
              {isSavingProgram ? "Saving..." : "Save program"}
            </Button>
          </>
        }
        onClose={() => setIsProgramSettingsOpen(false)}
        open={isProgramSettingsOpen}
        subtitle="Configure the core program details and publish state."
        title="Program settings"
      >
        <form className="grid gap-4 md:grid-cols-2" id="program-settings-form" onSubmit={handleProgramSave}>
          <FormField label="Program name">
            <Input onChange={(event) => setName(event.target.value)} required value={name} />
          </FormField>
          <FormField label="Slug">
            <Input
              onChange={(event) => setSlug(slugify(event.target.value))}
              required
              slugValidation={{
                kind: "program",
                orgSlug,
                currentSlug: savedSlug
              }}
              value={slug}
            />
          </FormField>
          <FormField label="Type">
            <Select
              onChange={(event) => setProgramType(event.target.value as "league" | "season" | "clinic" | "custom")}
              options={[
                { value: "league", label: "League" },
                { value: "season", label: "Season" },
                { value: "clinic", label: "Clinic" },
                { value: "custom", label: "Custom" }
              ]}
              value={programType}
            />
          </FormField>
          <FormField label="Status">
            <Select
              onChange={(event) => setStatus(event.target.value as "draft" | "published" | "archived")}
              options={[
                { value: "draft", label: "Draft" },
                { value: "published", label: "Published" },
                { value: "archived", label: "Archived" }
              ]}
              value={status}
            />
          </FormField>
          {programType === "custom" ? (
            <FormField className="md:col-span-2" label="Custom type label">
              <Input onChange={(event) => setCustomTypeLabel(event.target.value)} required value={customTypeLabel} />
            </FormField>
          ) : null}
          <FormField className="md:col-span-2" label="Description">
            <Textarea className="min-h-[80px]" onChange={(event) => setDescription(event.target.value)} value={description} />
          </FormField>
          <FormField label="Cover photo">
            <AssetTile
              constraints={{
                accept: "image/*,.svg",
                maxSizeMB: 10,
                aspect: "wide",
                recommendedPx: {
                  w: 1600,
                  h: 900
                }
              }}
              fit="cover"
              initialPath={coverImagePath || null}
              initialUrl={getOrgAssetPublicUrl(coverImagePath)}
              kind="org"
              onChange={(asset) => setCoverImagePath(asset.path)}
              onRemove={() => setCoverImagePath("")}
              orgSlug={orgSlug}
              purpose="program-cover"
              specificationText="PNG, JPG, WEBP, HEIC, or SVG"
              title="Program cover"
            />
          </FormField>
          <FormField label="Start date">
            <CalendarPicker onChange={setStartDate} value={startDate} />
          </FormField>
          <FormField label="End date">
            <CalendarPicker onChange={setEndDate} value={endDate} />
          </FormField>
        </form>
      </Panel>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Linked forms</CardTitle>
              <CardDescription>Forms connected to this program.</CardDescription>
            </div>
            <Button disabled={!canWriteForms || linkedForms.length > 0} onClick={openCreateFormPanel} type="button" variant="secondary">
              Create + link form
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canReadForms ? <Alert variant="info">You do not have permission to view forms.</Alert> : null}
          {canReadForms && !canWriteForms ? <Alert variant="info">You have read-only access to forms.</Alert> : null}

          {canReadForms ? (
            <>
              {linkedForms.length === 0 ? <Alert variant="info">No forms are linked to this program yet.</Alert> : null}
              {linkedForms.map((form) => (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border bg-surface px-3 py-3" key={form.id}>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-text">{form.name}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link className="text-sm font-semibold text-link hover:underline" href={`/${orgSlug}/tools/forms/${form.id}/editor`}>
                      Manage form
                    </Link>
                  </div>
                </div>
              ))}
            </>
          ) : null}
        </CardContent>
      </Card>

      <FormCreatePanel
        canWrite={canWriteForms}
        fixedProgram={{
          id: data.program.id,
          name: data.program.name
        }}
        onClose={() => setIsCreateFormOpen(false)}
        open={isCreateFormOpen}
        orgSlug={orgSlug}
        programs={[]}
      />

      <Card>
        <CardHeader className="pb-6">
          <CardTitle>Program structure</CardTitle>
          <CardDescription>Map out divisions and teams. Drag to reorder and nest any node under another.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex w-full flex-col items-center gap-3">
            <div className="w-[280px] max-w-[min(82vw,280px)] rounded-control border bg-surface px-4 py-3 text-center shadow-sm">
              <p className="text-xs uppercase tracking-wide text-text-muted">Program</p>
              <p className="font-semibold text-text">{name}</p>
            </div>
            <div className="relative">
              <Button
                aria-label="Open root actions"
                className="h-8 w-8 px-0"
                disabled={isMutatingNodes}
                onClick={() => setIsRootMenuOpen((current) => !current)}
                size="sm"
                type="button"
                variant="secondary"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              {isRootMenuOpen ? (
                <div className="absolute left-1/2 top-10 z-20 w-44 -translate-x-1/2 rounded-control border bg-surface p-2 shadow-floating">
                  <div className="space-y-1">
                    <Button
                      className="w-full justify-start"
                      onClick={() => {
                        openNodeCreatePanel(null, "division");
                        setIsRootMenuOpen(false);
                      }}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      Add division
                    </Button>
                    <Button
                      className="w-full justify-start"
                      onClick={() => {
                        openNodeCreatePanel(null, "team");
                        setIsRootMenuOpen(false);
                      }}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <Users className="h-3.5 w-3.5" />
                      Add team
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
            {nodes.length === 0 ? <Alert variant="info">No structure nodes yet. Add a division or team to start the map.</Alert> : null}
          </div>

          {nodes.length > 0 || activeDragNodeId ? (
            <DndContext
              collisionDetection={closestCenter}
              onDragCancel={() => setActiveDragNodeId(null)}
              onDragEnd={handleNodeDragEnd}
              onDragStart={handleNodeDragStart}
              sensors={sensors}
            >
              {renderStructureBranch(null)}
            </DndContext>
          ) : null}
        </CardContent>
      </Card>

      <Panel
        footer={
          <>
            <Button onClick={() => setIsNodeEditOpen(false)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button disabled={isMutatingNodes} form="edit-structure-node-form" loading={isMutatingNodes} type="submit" variant="secondary">
              {isMutatingNodes ? "Saving..." : "Save node"}
            </Button>
          </>
        }
        onClose={() => setIsNodeEditOpen(false)}
        open={isNodeEditOpen}
        subtitle="Edit node details for your structure map."
        title="Edit node"
      >
        <form className="grid gap-3 md:grid-cols-2" id="edit-structure-node-form" onSubmit={handleNodeEditSave}>
          <FormField label="Name">
            <Input onChange={(event) => setEditingNodeName(event.target.value)} required value={editingNodeName} />
          </FormField>
          <FormField hint="Optional, auto-generated if blank." label="Slug">
            <Input onChange={(event) => setEditingNodeSlug(slugify(event.target.value))} value={editingNodeSlug} />
          </FormField>
          <FormField label="Type">
            <Select
              onChange={(event) => setEditingNodeKind(event.target.value as "division" | "team")}
              options={[
                { value: "division", label: "Division" },
                { value: "team", label: "Team" }
              ]}
              value={editingNodeKind}
            />
          </FormField>
          <FormField hint="Optional" label="Capacity">
            <Input onChange={(event) => setEditingCapacity(event.target.value)} type="number" value={editingCapacity} />
          </FormField>
          <label className="inline-flex items-center gap-2 rounded-control border bg-surface px-3 py-2 text-sm text-text">
            <input checked={editingWaitlistEnabled} onChange={(event) => setEditingWaitlistEnabled(event.target.checked)} type="checkbox" />
            Waitlist enabled
          </label>
          <label className="inline-flex items-center gap-2 rounded-control border bg-surface px-3 py-2 text-sm text-text">
            <input checked={editingPublished} onChange={(event) => setEditingPublished(event.target.checked)} type="checkbox" />
            Published
          </label>
        </form>
      </Panel>

      <Panel
        footer={
          <>
            <Button onClick={() => setIsDivisionCreateOpen(false)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button disabled={isMutatingNodes} form="create-structure-node-form" loading={isMutatingNodes} type="submit" variant="secondary">
              {isMutatingNodes ? "Saving..." : "Add node"}
            </Button>
          </>
        }
        onClose={() => setIsDivisionCreateOpen(false)}
        open={isDivisionCreateOpen}
        subtitle="Add divisions or teams anywhere in your structure map."
        title="Add structure node"
      >
        <form className="grid gap-3 md:grid-cols-2" id="create-structure-node-form" onSubmit={handleNodeCreate}>
          <FormField label="Name">
            <Input onChange={(event) => setNodeName(event.target.value)} required value={nodeName} />
          </FormField>
          <FormField hint="Optional, auto-generated if blank." label="Slug">
            <Input onChange={(event) => setNodeSlug(slugify(event.target.value))} value={nodeSlug} />
          </FormField>
          <FormField label="Type">
            <Select
              onChange={(event) => setNodeKind(event.target.value as "division" | "team")}
              options={[
                { value: "division", label: "Division" },
                { value: "team", label: "Team" }
              ]}
              value={nodeKind}
            />
          </FormField>
          <FormField label="Parent">
            <Select onChange={(event) => setParentId(event.target.value)} options={parentOptions} value={parentId} />
          </FormField>
          <FormField hint="Optional" label="Capacity">
            <Input onChange={(event) => setCapacity(event.target.value)} type="number" value={capacity} />
          </FormField>
          <label className="inline-flex items-center gap-2 rounded-control border bg-surface px-3 py-2 text-sm text-text">
            <input checked={waitlistEnabled} onChange={(event) => setWaitlistEnabled(event.target.checked)} type="checkbox" />
            Waitlist enabled
          </label>
        </form>
      </Panel>

      <Card>
        <CardHeader>
          <CardTitle>Schedule blocks</CardTitle>
          <CardDescription>Model long-running seasons or one-off clinics.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-3 md:grid-cols-2" onSubmit={handleScheduleCreate}>
            <FormField label="Block type">
              <Select
                onChange={(event) => setScheduleType(event.target.value as "date_range" | "meeting_pattern" | "one_off")}
                options={[
                  { value: "date_range", label: "Date range" },
                  { value: "meeting_pattern", label: "Meeting pattern" },
                  { value: "one_off", label: "One-off" }
                ]}
                value={scheduleType}
              />
            </FormField>
            <FormField hint="Optional" label="Title">
              <Input onChange={(event) => setScheduleTitle(event.target.value)} value={scheduleTitle} />
            </FormField>
            <FormField label="Target node">
              <Select onChange={(event) => setScheduleNodeId(event.target.value)} options={parentOptions} value={scheduleNodeId} />
            </FormField>
            {scheduleType !== "one_off" ? (
              <>
                <FormField label="Start date">
                  <CalendarPicker onChange={setScheduleStartDate} value={scheduleStartDate} />
                </FormField>
                <FormField label="End date">
                  <CalendarPicker onChange={setScheduleEndDate} value={scheduleEndDate} />
                </FormField>
              </>
            ) : (
              <>
                <FormField label="One-off date">
                  <CalendarPicker
                    onChange={(nextDate) => setScheduleOneOffAt(combineDateTimeLocal(nextDate, scheduleOneOffParts.time))}
                    value={scheduleOneOffParts.date}
                  />
                </FormField>
                <FormField label="One-off time">
                  <Input
                    onChange={(event) => setScheduleOneOffAt(combineDateTimeLocal(scheduleOneOffParts.date, event.target.value))}
                    type="time"
                    value={scheduleOneOffParts.time}
                  />
                </FormField>
              </>
            )}
            <FormField hint="For meeting pattern only. Example: 2,4 (Tue/Thu)." label="By day">
              <Input onChange={(event) => setScheduleByDay(event.target.value)} value={scheduleByDay} />
            </FormField>
            <FormField hint="Optional" label="Start time">
              <Input onChange={(event) => setScheduleStartTime(event.target.value)} type="time" value={scheduleStartTime} />
            </FormField>
            <FormField hint="Optional" label="End time">
              <Input onChange={(event) => setScheduleEndTime(event.target.value)} type="time" value={scheduleEndTime} />
            </FormField>
            <div className="md:col-span-2">
              <Button disabled={isMutatingSchedule} loading={isMutatingSchedule} type="submit" variant="secondary">
                {isMutatingSchedule ? "Saving..." : "Add schedule block"}
              </Button>
            </div>
          </form>

          {scheduleBlocks.length === 0 ? <Alert variant="info">No schedule blocks yet.</Alert> : null}
          {scheduleBlocks.map((schedule) => (
            <div className="flex items-start justify-between rounded-control border bg-surface px-3 py-3" key={schedule.id}>
              <div>
                <p className="font-semibold text-text">{schedule.title ?? "Untitled block"}</p>
                <p className="text-xs text-text-muted">type: {schedule.blockType}</p>
                <p className="text-xs text-text-muted">
                  {schedule.blockType === "one_off"
                    ? schedule.oneOffAt ?? ""
                    : `${schedule.startDate ?? ""} → ${schedule.endDate ?? ""}`}
                </p>
              </div>
              <Button
                disabled={isMutatingSchedule}
                onClick={() => handleScheduleDelete(schedule.id)}
                size="sm"
                type="button"
                variant="destructive"
              >
                Delete
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
