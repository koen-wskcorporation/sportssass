"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type CalendarPickerProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  name?: string;
  min?: string;
  max?: string;
  className?: string;
};

const weekdayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseIsoDate(value: string) {
  if (!isIsoDate(value)) {
    return null;
  }

  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number.parseInt(yearRaw ?? "", 10);
  const month = Number.parseInt(monthRaw ?? "", 10);
  const day = Number.parseInt(dayRaw ?? "", 10);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  const next = new Date(year, month - 1, day);

  if (next.getFullYear() !== year || next.getMonth() !== month - 1 || next.getDate() !== day) {
    return null;
  }

  return next;
}

function toIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayIsoDate() {
  return toIsoDate(new Date());
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function formatMonthLabel(value: Date) {
  return value.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });
}

function formatSelectedLabel(value: string) {
  const parsed = parseIsoDate(value);

  if (!parsed) {
    return "";
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function isOutsideBounds(dateIso: string, min?: string, max?: string) {
  if (min && dateIso < min) {
    return true;
  }

  if (max && dateIso > max) {
    return true;
  }

  return false;
}

export function CalendarPicker({ value, onChange, disabled, placeholder = "Select date", id, name, min, max, className }: CalendarPickerProps) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const selectedDate = parseIsoDate(value);
  const [open, setOpen] = React.useState(false);
  const [visibleMonth, setVisibleMonth] = React.useState<Date>(() => startOfMonth(selectedDate ?? new Date()));
  const selectedLabel = formatSelectedLabel(value);
  const today = todayIsoDate();

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const selected = parseIsoDate(value);
    if (selected) {
      setVisibleMonth(startOfMonth(selected));
    }
  }, [open, value]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const root = rootRef.current;
      if (!root) {
        return;
      }

      if (event.target instanceof Node && !root.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const monthStart = startOfMonth(visibleMonth);
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const firstWeekday = monthStart.getDay();

  const days = Array.from({ length: 42 }, (_, index) => {
    return new Date(year, month, index - firstWeekday + 1);
  });

  return (
    <div className={cn("relative", className)} ref={rootRef}>
      <input name={name} type="hidden" value={value} />
      <button
        aria-disabled={disabled || undefined}
        aria-expanded={open}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-control border bg-surface px-3 py-2 text-left text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-55",
          !selectedLabel ? "text-text-muted" : null
        )}
        disabled={disabled}
        id={id}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{selectedLabel || placeholder}</span>
        <CalendarDays aria-hidden className="h-4 w-4 shrink-0" />
      </button>

      {open ? (
        <div className="absolute z-50 mt-2 w-[18rem] rounded-card border bg-surface p-3 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <button
              className="inline-flex h-8 w-8 items-center justify-center rounded-control border bg-surface text-text hover:bg-surface-muted"
              onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              type="button"
            >
              <ChevronLeft aria-hidden className="h-4 w-4" />
              <span className="sr-only">Previous month</span>
            </button>
            <p className="text-sm font-semibold text-text">{formatMonthLabel(monthStart)}</p>
            <button
              className="inline-flex h-8 w-8 items-center justify-center rounded-control border bg-surface text-text hover:bg-surface-muted"
              onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              type="button"
            >
              <ChevronRight aria-hidden className="h-4 w-4" />
              <span className="sr-only">Next month</span>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {weekdayLabels.map((label) => (
              <div className="pb-1 text-center text-xs font-medium text-text-muted" key={label}>
                {label}
              </div>
            ))}
            {days.map((day) => {
              const iso = toIsoDate(day);
              const inMonth = day.getMonth() === month;
              const selected = iso === value;
              const isToday = iso === today;
              const unavailable = isOutsideBounds(iso, min, max);

              return (
                <button
                  aria-pressed={selected}
                  className={cn(
                    "inline-flex h-9 items-center justify-center rounded-control text-sm transition-colors",
                    inMonth ? "text-text" : "text-text-muted",
                    selected ? "bg-accent text-accent-foreground" : "hover:bg-surface-muted",
                    isToday && !selected ? "border border-accent/40" : null,
                    unavailable ? "cursor-not-allowed opacity-40 hover:bg-transparent" : null
                  )}
                  disabled={unavailable}
                  key={iso}
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  type="button"
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              className="text-xs text-text-muted underline-offset-4 hover:underline"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              type="button"
            >
              Clear
            </button>
            <button
              className="text-xs text-text-muted underline-offset-4 hover:underline"
              onClick={() => {
                const next = todayIsoDate();
                if (!isOutsideBounds(next, min, max)) {
                  onChange(next);
                }
                setOpen(false);
              }}
              type="button"
            >
              Today
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
