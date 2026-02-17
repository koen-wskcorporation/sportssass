"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type EditorSettingsDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  footer?: React.ReactNode;
};

export function EditorSettingsDialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  contentClassName,
  footer
}: EditorSettingsDialogProps) {
  return (
    <Dialog onClose={onClose} open={open}>
      <DialogContent className={cn("p-0", className)}>
        <div className="flex max-h-[calc(100vh-2.5rem)] flex-col overflow-hidden">
          <DialogHeader className="shrink-0 border-b px-5 py-4">
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>

          <div
            className={cn(
              "min-h-0 overflow-x-hidden overflow-y-auto break-words px-5 py-4 [overflow-wrap:anywhere] [&_*]:max-w-full [&_*]:min-w-0",
              contentClassName
            )}
          >
            <div className="min-w-0">{children}</div>
          </div>

          <DialogFooter className="shrink-0 border-t px-5 py-4">
            {footer ?? (
              <Button onClick={onClose} size="sm" variant="secondary">
                Done
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
