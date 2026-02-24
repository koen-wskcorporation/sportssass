"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const PANEL_WIDTH = 430;
const PANEL_COUNT_ATTRIBUTE = "data-panel-count";

type PanelProps = {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  panelClassName?: string;
  contentClassName?: string;
  panelStyle?: React.CSSProperties;
};

export function Panel({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  panelClassName,
  contentClassName,
  panelStyle
}: PanelProps) {
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const onCloseRef = React.useRef(onClose);
  const [mounted, setMounted] = React.useState(false);
  const [portalTarget, setPortalTarget] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    setMounted(true);
    setPortalTarget(document.getElementById("panel-dock") ?? document.body);
    return () => setMounted(false);
  }, []);

  React.useLayoutEffect(() => {
    if (!open) {
      return;
    }

    const panelCount = Number(document.body.getAttribute(PANEL_COUNT_ATTRIBUTE) ?? "0");

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }
    };

    const syncActiveWidth = () => {
      document.body.style.setProperty("--panel-active-width", `${Math.min(window.innerWidth, PANEL_WIDTH)}px`);
    };

    document.body.setAttribute(PANEL_COUNT_ATTRIBUTE, String(panelCount + 1));
    document.body.classList.add("panel-open");
    syncActiveWidth();
    window.addEventListener("resize", syncActiveWidth);
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            syncActiveWidth();
          })
        : null;

    if (panelRef.current && resizeObserver) {
      resizeObserver.observe(panelRef.current);
    }

    const rafId = window.requestAnimationFrame(syncActiveWidth);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", syncActiveWidth);
      resizeObserver?.disconnect();
      const nextCount = Math.max(0, Number(document.body.getAttribute(PANEL_COUNT_ATTRIBUTE) ?? "1") - 1);

      if (nextCount === 0) {
        document.body.classList.remove("panel-open");
        document.body.style.removeProperty("--panel-active-width");
        document.body.removeAttribute(PANEL_COUNT_ATTRIBUTE);
      } else {
        document.body.setAttribute(PANEL_COUNT_ATTRIBUTE, String(nextCount));
        syncActiveWidth();
      }

      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!mounted || !open || !portalTarget) {
    return null;
  }

  const isDocked = portalTarget.id === "panel-dock";

  return createPortal(
    <aside
      aria-label={typeof title === "string" ? title : undefined}
      className={cn(
        isDocked ? "sticky top-0 z-[100] h-dvh w-full" : "fixed inset-y-0 right-0 z-[100] h-dvh max-w-full",
        "flex min-w-0 shrink-0 flex-col border-l bg-surface shadow-floating",
        panelClassName
      )}
      ref={panelRef}
      role="complementary"
      style={{
        ...panelStyle,
        width: isDocked ? "100%" : "min(100vw, 430px)"
      }}
    >
      <div className="relative shrink-0 border-b px-5 py-4 pr-16">
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-text-muted">{subtitle}</p> : null}
      </div>

      <button
        aria-label="Close panel"
        className="absolute right-3 top-3 z-[101] inline-flex h-9 w-9 items-center justify-center rounded-full border bg-surface text-lg leading-none text-text shadow-sm hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onClose}
        type="button"
      >
        ×
      </button>

      <div className={cn("min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-5 py-4 [overflow-wrap:anywhere]", contentClassName)}>{children}</div>

      {footer ? <div className="shrink-0 border-t bg-surface px-5 py-4 flex flex-wrap items-center justify-end gap-2">{footer}</div> : null}
    </aside>,
    portalTarget
  );
}
