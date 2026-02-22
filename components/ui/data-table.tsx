"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, ArrowUpDown, GripVertical, Search, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type SortDirection = "asc" | "desc";

export type DataTableColumn<TItem> = {
  key: string;
  label: string;
  defaultVisible?: boolean;
  sortable?: boolean;
  searchable?: boolean;
  className?: string;
  headerClassName?: string;
  renderCell: (item: TItem) => ReactNode;
  renderSortValue?: (item: TItem) => string | number | Date | null | undefined;
  renderSearchValue?: (item: TItem) => string;
};

type DataTablePersistedState = {
  visibleColumnKeys?: unknown;
  columnOrderKeys?: unknown;
};

type DataTableProps<TItem> = {
  ariaLabel?: string;
  data: TItem[];
  columns: DataTableColumn<TItem>[];
  rowKey: (item: TItem) => string;
  storageKey?: string;
  emptyState: ReactNode;
  searchPlaceholder?: string;
  initialVisibleColumnKeys?: string[];
  defaultSort?: {
    columnKey: string;
    direction?: SortDirection;
  };
  onRowClick?: (item: TItem) => void;
  getRowClassName?: (item: TItem) => string | undefined;
  selectedRowKey?: string | null;
  rowActionsLabel?: string;
  renderRowActions?: (item: TItem) => ReactNode;
};

function normalizeColumnOrder(rawValue: unknown, allColumnKeys: string[]) {
  if (!Array.isArray(rawValue)) {
    return allColumnKeys;
  }

  const recognizedKeys = allColumnKeys.filter((key) => rawValue.includes(key));
  const missingKeys = allColumnKeys.filter((key) => !recognizedKeys.includes(key));
  return [...recognizedKeys, ...missingKeys];
}

function normalizeVisibleColumns(rawValue: unknown, allColumnKeys: string[], defaultVisibleColumns: string[]) {
  if (!Array.isArray(rawValue)) {
    return defaultVisibleColumns;
  }

  const normalized = allColumnKeys.filter((key) => rawValue.includes(key));
  return normalized.length > 0 ? normalized : defaultVisibleColumns;
}

function normalizeSortValue(value: string | number | Date | null | undefined) {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string") {
    return value.toLowerCase();
  }

  return value ?? "";
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest("button, a, input, select, textarea, [role='button'], [data-row-action='true']"));
}

type SortableHeaderCellProps = {
  columnKey: string;
  label: string;
  sortable: boolean;
  isSorted: boolean;
  sortDirection: SortDirection;
  headerClassName?: string;
  onSortToggle: (columnKey: string) => void;
};

function SortableHeaderCell({
  columnKey,
  label,
  sortable,
  isSorted,
  sortDirection,
  headerClassName,
  onSortToggle
}: SortableHeaderCellProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: columnKey
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    position: isDragging ? "relative" : undefined
  };

  return (
    <th
      className={cn(
        "h-11 px-4 text-left align-middle text-[12px] font-semibold text-text-muted",
        isDragging ? "bg-surface ring-1 ring-border" : undefined,
        headerClassName
      )}
      ref={setNodeRef}
      style={style}
    >
      <div className="flex items-center gap-1.5">
        <button
          aria-label={`Drag ${label} column`}
          className="inline-flex h-6 w-6 items-center justify-center rounded-control text-text-muted hover:bg-surface hover:text-text"
          type="button"
          {...attributes}
          {...listeners}
        >
          <GripVertical aria-hidden className="h-3.5 w-3.5" />
        </button>
        {sortable ? (
          <button
            className="inline-flex items-center gap-1 text-left text-[12px] font-semibold text-text-muted hover:text-text"
            onClick={() => onSortToggle(columnKey)}
            type="button"
          >
            {label}
            {isSorted ? (
              sortDirection === "asc" ? (
                <ArrowUp aria-hidden className="h-3.5 w-3.5" />
              ) : (
                <ArrowDown aria-hidden className="h-3.5 w-3.5" />
              )
            ) : (
              <ArrowUpDown aria-hidden className="h-3.5 w-3.5 opacity-60" />
            )}
          </button>
        ) : (
          <span className="text-[12px] font-semibold text-text-muted">{label}</span>
        )}
      </div>
    </th>
  );
}

export function DataTable<TItem>({
  ariaLabel,
  data,
  columns,
  rowKey,
  storageKey,
  emptyState,
  searchPlaceholder = "Search...",
  initialVisibleColumnKeys,
  defaultSort,
  onRowClick,
  getRowClassName,
  selectedRowKey,
  rowActionsLabel = "Actions",
  renderRowActions
}: DataTableProps<TItem>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isColumnsDialogOpen, setIsColumnsDialogOpen] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const allColumnKeys = useMemo(() => columns.map((column) => column.key), [columns]);

  const defaultVisibleColumns = useMemo(() => {
    if (initialVisibleColumnKeys && initialVisibleColumnKeys.length > 0) {
      const normalized = allColumnKeys.filter((key) => initialVisibleColumnKeys.includes(key));
      return normalized.length > 0 ? normalized : allColumnKeys;
    }

    const fromColumns = columns.filter((column) => column.defaultVisible !== false).map((column) => column.key);
    return fromColumns.length > 0 ? fromColumns : allColumnKeys;
  }, [allColumnKeys, columns, initialVisibleColumnKeys]);

  const [columnOrderKeys, setColumnOrderKeys] = useState<string[]>(allColumnKeys);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(defaultVisibleColumns);
  const [sortColumnKey, setSortColumnKey] = useState<string | null>(defaultSort?.columnKey ?? null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSort?.direction ?? "asc");

  const columnByKey = useMemo(() => new Map(columns.map((column) => [column.key, column])), [columns]);

  useEffect(() => {
    setColumnOrderKeys((current) => normalizeColumnOrder(current, allColumnKeys));
    setVisibleColumnKeys((current) => normalizeVisibleColumns(current, allColumnKeys, defaultVisibleColumns));
  }, [allColumnKeys, defaultVisibleColumns]);

  useEffect(() => {
    if (!storageKey) {
      return;
    }

    try {
      const storedRaw = window.localStorage.getItem(storageKey);
      if (!storedRaw) {
        return;
      }

      const parsed = JSON.parse(storedRaw) as DataTablePersistedState;

      setColumnOrderKeys(normalizeColumnOrder(parsed.columnOrderKeys, allColumnKeys));
      setVisibleColumnKeys(normalizeVisibleColumns(parsed.visibleColumnKeys, allColumnKeys, defaultVisibleColumns));
    } catch {
      setColumnOrderKeys(allColumnKeys);
      setVisibleColumnKeys(defaultVisibleColumns);
    }
  }, [allColumnKeys, defaultVisibleColumns, storageKey]);

  useEffect(() => {
    if (!storageKey) {
      return;
    }

    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          visibleColumnKeys,
          columnOrderKeys
        })
      );
    } catch {
      // Ignore localStorage failures.
    }
  }, [columnOrderKeys, storageKey, visibleColumnKeys]);

  const orderedColumns = useMemo(() => {
    return columnOrderKeys.map((key) => columnByKey.get(key)).filter((column): column is DataTableColumn<TItem> => Boolean(column));
  }, [columnByKey, columnOrderKeys]);

  const visibleColumns = useMemo(() => {
    return orderedColumns.filter((column) => visibleColumnKeys.includes(column.key));
  }, [orderedColumns, visibleColumnKeys]);

  const searchableColumns = useMemo(() => {
    const explicitSearchable = orderedColumns.filter((column) => column.searchable !== false);
    return explicitSearchable.length > 0 ? explicitSearchable : orderedColumns;
  }, [orderedColumns]);

  useEffect(() => {
    if (sortColumnKey && !visibleColumnKeys.includes(sortColumnKey)) {
      setSortColumnKey(null);
    }
  }, [sortColumnKey, visibleColumnKeys]);

  const filteredAndSortedRows = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filteredRows = normalizedQuery
      ? data.filter((item) => {
          const composedSearch = searchableColumns
            .map((column) => {
              if (column.renderSearchValue) {
                return column.renderSearchValue(item);
              }

              if (column.renderSortValue) {
                return String(column.renderSortValue(item) ?? "");
              }

              return "";
            })
            .join(" ")
            .toLowerCase();

          return composedSearch.includes(normalizedQuery);
        })
      : data;

    const sortColumn = sortColumnKey ? columnByKey.get(sortColumnKey) : null;
    if (!sortColumn?.sortable) {
      return filteredRows;
    }

    const directionFactor = sortDirection === "asc" ? 1 : -1;

    return [...filteredRows].sort((left, right) => {
      const leftValue = normalizeSortValue(sortColumn.renderSortValue?.(left));
      const rightValue = normalizeSortValue(sortColumn.renderSortValue?.(right));

      if (leftValue < rightValue) {
        return -1 * directionFactor;
      }

      if (leftValue > rightValue) {
        return 1 * directionFactor;
      }

      return 0;
    });
  }, [columnByKey, data, searchQuery, searchableColumns, sortColumnKey, sortDirection]);

  function handleColumnToggle(columnKey: string, nextChecked: boolean) {
    setVisibleColumnKeys((current) => {
      const withChange = nextChecked ? [...current, columnKey] : current.filter((key) => key !== columnKey);
      const normalized = allColumnKeys.filter((key) => withChange.includes(key));
      return normalized.length > 0 ? normalized : [columnKey];
    });
  }

  function handleSortToggle(columnKey: string) {
    if (sortColumnKey !== columnKey) {
      setSortColumnKey(columnKey);
      setSortDirection("asc");
      return;
    }

    setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
  }

  function handleInlineHeaderReorder(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;

    if (!overId || activeId === overId) {
      return;
    }

    setColumnOrderKeys((current) => {
      const visibleKeysInOrder = current.filter((key) => visibleColumnKeys.includes(key));
      const oldIndex = visibleKeysInOrder.indexOf(activeId);
      const newIndex = visibleKeysInOrder.indexOf(overId);

      if (oldIndex < 0 || newIndex < 0) {
        return current;
      }

      const reorderedVisibleKeys = arrayMove(visibleKeysInOrder, oldIndex, newIndex);
      let visibleCursor = 0;

      return current.map((key) => {
        if (!visibleColumnKeys.includes(key)) {
          return key;
        }

        const nextKey = reorderedVisibleKeys[visibleCursor];
        visibleCursor += 1;
        return nextKey;
      });
    });
  }

  return (
    <>
      <div className="overflow-hidden rounded-control border border-border/80 bg-surface">
        <div className="flex flex-col gap-3 border-b border-border/80 bg-surface-muted/35 p-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              className="pl-9"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={searchPlaceholder}
              value={searchQuery}
            />
          </div>

          <div className="flex items-center gap-2">
            <p className="text-xs text-text-muted">
              {filteredAndSortedRows.length} of {data.length}
            </p>
            <Button onClick={() => setIsColumnsDialogOpen(true)} size="sm" variant="secondary">
              <Settings2 aria-hidden className="h-3.5 w-3.5" />
              Columns
            </Button>
            <Button
              onClick={() => {
                setColumnOrderKeys(allColumnKeys);
                setVisibleColumnKeys(defaultVisibleColumns);
                setSortColumnKey(defaultSort?.columnKey ?? null);
                setSortDirection(defaultSort?.direction ?? "asc");
              }}
              size="sm"
              variant="ghost"
            >
              Reset
            </Button>
          </div>
        </div>

        <DndContext collisionDetection={closestCenter} onDragEnd={handleInlineHeaderReorder} sensors={sensors}>
          <Table aria-label={ariaLabel}>
            <TableHeader className="sticky top-0 z-10 bg-surface-muted/90 backdrop-blur supports-[backdrop-filter]:bg-surface-muted/75">
              <SortableContext items={visibleColumns.map((column) => column.key)} strategy={horizontalListSortingStrategy}>
                <TableRow>
                  {visibleColumns.map((column) => (
                    <SortableHeaderCell
                      columnKey={column.key}
                      headerClassName={column.headerClassName}
                      isSorted={sortColumnKey === column.key}
                      key={column.key}
                      label={column.label}
                      onSortToggle={handleSortToggle}
                      sortDirection={sortDirection}
                      sortable={Boolean(column.sortable)}
                    />
                  ))}
                  {renderRowActions ? <TableHead className="text-right">{rowActionsLabel}</TableHead> : null}
                </TableRow>
              </SortableContext>
            </TableHeader>
            <TableBody>
              {filteredAndSortedRows.length === 0 ? (
                <TableRow>
                  <TableCell className="py-10 text-center text-text-muted" colSpan={visibleColumns.length + (renderRowActions ? 1 : 0)}>
                    {emptyState}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedRows.map((item) => {
                  const key = rowKey(item);
                  const isSelected = selectedRowKey === key;

                  return (
                    <TableRow
                      className={cn(
                        onRowClick ? "cursor-pointer" : undefined,
                        isSelected ? "bg-surface-muted/60" : undefined,
                        getRowClassName?.(item)
                      )}
                      key={key}
                      onClick={(event) => {
                        if (!onRowClick || isInteractiveTarget(event.target)) {
                          return;
                        }

                        onRowClick(item);
                      }}
                      onKeyDown={(event) => {
                        if (!onRowClick || isInteractiveTarget(event.target)) {
                          return;
                        }

                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onRowClick(item);
                        }
                      }}
                      role={onRowClick ? "button" : undefined}
                      tabIndex={onRowClick ? 0 : undefined}
                    >
                      {visibleColumns.map((column) => (
                        <TableCell className={cn(column.className)} key={column.key}>
                          {column.renderCell(item)}
                        </TableCell>
                      ))}
                      {renderRowActions ? (
                        <TableCell className="w-1 whitespace-nowrap text-right">
                          <div className="inline-flex items-center gap-1" data-row-action="true">
                            {renderRowActions(item)}
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>

      <Dialog onClose={() => setIsColumnsDialogOpen(false)} open={isColumnsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Table columns</DialogTitle>
            <DialogDescription>Show or hide columns. Drag headers inline to reorder.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {orderedColumns.map((column) => {
              const checked = visibleColumnKeys.includes(column.key);

              return (
                <label
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-control border bg-surface px-3 py-2 text-sm",
                    !checked ? "opacity-80" : undefined
                  )}
                  key={column.key}
                >
                  <span>{column.label}</span>
                  <input checked={checked} onChange={(event) => handleColumnToggle(column.key, event.target.checked)} type="checkbox" />
                </label>
              );
            })}
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setColumnOrderKeys(allColumnKeys);
                setVisibleColumnKeys(defaultVisibleColumns);
              }}
              variant="ghost"
            >
              Reset defaults
            </Button>
            <Button onClick={() => setIsColumnsDialogOpen(false)} variant="secondary">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
