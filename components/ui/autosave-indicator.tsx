"use client";

import { cn } from "@/lib/utils";

export type AutosaveState = "idle" | "dirty" | "saving" | "saved" | "error";

type AutosaveIndicatorProps = {
  state: AutosaveState;
  lastSavedAtUtc?: string | null;
  errorMessage?: string | null;
  className?: string;
};

function formatSavedLabel(lastSavedAtUtc?: string | null) {
  if (!lastSavedAtUtc) {
    return "Saved";
  }

  const date = new Date(lastSavedAtUtc);
  if (Number.isNaN(date.getTime())) {
    return "Saved";
  }

  return `Saved ${date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  })}`;
}

export function AutosaveIndicator({ state, lastSavedAtUtc, errorMessage, className }: AutosaveIndicatorProps) {
  const label =
    state === "saving"
      ? "Saving draft..."
      : state === "dirty"
        ? "Unsaved changes"
        : state === "error"
          ? errorMessage || "Autosave failed"
          : state === "saved"
            ? formatSavedLabel(lastSavedAtUtc)
            : "Idle";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
        state === "error"
          ? "border-danger/45 bg-danger/10 text-danger"
          : state === "saving"
            ? "border-accent/45 bg-accent/10 text-text"
            : "border-border/70 bg-surface/80 text-text-muted",
        className
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          state === "error"
            ? "bg-danger"
            : state === "saving"
              ? "animate-pulse bg-accent"
              : state === "dirty"
                ? "bg-text-muted"
                : "bg-success"
        )}
      />
      <span>{label}</span>
    </div>
  );
}
