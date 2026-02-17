"use client";

import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DraggableAttributes } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";

export type SortableHandleProps = {
  attributes: DraggableAttributes;
  listeners: any;
};

export type SortableRenderMeta = {
  handleProps: SortableHandleProps;
  isDragging: boolean;
  isActivePlaceholder: boolean;
};

type SortableCanvasProps<TItem> = {
  items: TItem[];
  getId: (item: TItem) => string;
  onReorder: (nextItems: TItem[]) => void;
  renderItem: (item: TItem, meta: SortableRenderMeta) => ReactNode;
  renderOverlay?: (item: TItem) => ReactNode;
  className?: string;
};

function toTransform(transform: { x: number; y: number; scaleX: number; scaleY: number } | null) {
  if (!transform) {
    return undefined;
  }

  return `translate3d(${transform.x}px, ${transform.y}px, 0)`;
}

function SortableCanvasItem<TItem>({
  item,
  itemId,
  activeId,
  renderItem
}: {
  item: TItem;
  itemId: string;
  activeId: string | null;
  renderItem: SortableCanvasProps<TItem>["renderItem"];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: itemId });

  const style: CSSProperties = {
    transform: toTransform(transform),
    transition,
    zIndex: isDragging ? 30 : undefined
  };

  return (
    <div ref={setNodeRef} style={style}>
      {renderItem(item, {
        handleProps: {
          attributes,
          listeners
        },
        isDragging,
        isActivePlaceholder: activeId === itemId
      })}
    </div>
  );
}

export function SortableCanvas<TItem>({ items, getId, onReorder, renderItem, renderOverlay, className }: SortableCanvasProps<TItem>) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeItem = useMemo(() => {
    if (!activeId) {
      return null;
    }

    return items.find((item) => getId(item) === activeId) ?? null;
  }, [activeId, getId, items]);

  const itemIds = items.map((item) => getId(item));

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragCancel={() => {
        setActiveId(null);
      }}
      onDragEnd={(event) => {
        setActiveId(null);
        const activeItemId = String(event.active.id);
        const overId = event.over ? String(event.over.id) : null;

        if (!overId || activeItemId === overId) {
          return;
        }

        const oldIndex = items.findIndex((item) => getId(item) === activeItemId);
        const newIndex = items.findIndex((item) => getId(item) === overId);

        if (oldIndex < 0 || newIndex < 0) {
          return;
        }

        onReorder(arrayMove(items, oldIndex, newIndex));
      }}
      onDragStart={(event) => {
        setActiveId(String(event.active.id));
      }}
      sensors={sensors}
    >
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className={className ?? "space-y-4"}>
          {items.map((item) => {
            const itemId = getId(item);

            return <SortableCanvasItem activeId={activeId} item={item} itemId={itemId} key={itemId} renderItem={renderItem} />;
          })}
        </div>
      </SortableContext>

      <DragOverlay>{activeItem && renderOverlay ? renderOverlay(activeItem) : null}</DragOverlay>
    </DndContext>
  );
}
