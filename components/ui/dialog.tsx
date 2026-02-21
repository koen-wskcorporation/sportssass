"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export function Dialog({ open, onClose, children }: DialogProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousBodyOverflow = document.body.style.overflow;

    const focusableSelector = [
      "a[href]",
      "button:not([disabled])",
      "textarea:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "[tabindex]:not([tabindex='-1'])"
    ].join(",");

    const setInitialFocus = () => {
      const root = containerRef.current;
      if (!root) {
        return;
      }

      const focusable = root.querySelectorAll<HTMLElement>(focusableSelector);
      const firstFocusable = focusable[0];

      if (firstFocusable) {
        firstFocusable.focus();
        return;
      }

      root.focus();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const root = containerRef.current;
      if (!root) {
        return;
      }

      const focusable = Array.from(root.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => !element.hasAttribute("disabled") && element.tabIndex !== -1
      );

      if (focusable.length === 0) {
        event.preventDefault();
        root.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

      if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }

      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      }
    };

    document.body.style.overflow = "hidden";
    setInitialFocus();
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousActiveElement?.focus();
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-text/45 px-4" onClick={onClose} role="presentation">
      <div aria-modal="true" onClick={(event) => event.stopPropagation()} ref={containerRef} role="dialog" tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}

export function DialogContent({ className, style, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "max-h-[calc(100vh-1rem)] overflow-x-hidden overflow-y-auto rounded-card border bg-surface p-5 text-text shadow-card [overflow-wrap:anywhere]",
        className
      )}
      style={{
        ...(style ?? {}),
        width: "25vw",
        minWidth: "25vw",
        maxWidth: "25vw"
      }}
      {...props}
    />
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 space-y-1", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-semibold text-text", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-text-muted", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-6 flex justify-end gap-2", className)} {...props} />;
}
