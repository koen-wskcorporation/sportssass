import * as React from "react";
import { Alert, type AlertProps } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export function Toast({ className, ...props }: AlertProps) {
  return <Alert className={cn("shadow-md", className)} {...props} />;
}

export function ToastViewport({ children }: { children: React.ReactNode }) {
  return <div className="fixed right-4 top-4 z-50 grid gap-2">{children}</div>;
}
