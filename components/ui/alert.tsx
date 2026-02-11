import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("rounded-md border p-4 text-sm", {
  variants: {
    variant: {
      info: "border-secondary/30 bg-secondary/10 text-foreground",
      success: "border-success/30 bg-success/10 text-foreground",
      warning: "border-primary/30 bg-primary/10 text-foreground",
      destructive: "border-destructive/30 bg-destructive/10 text-foreground"
    }
  },
  defaultVariants: {
    variant: "info"
  }
});

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {}

export function Alert({ className, variant, ...props }: AlertProps) {
  return <div className={cn(alertVariants({ variant }), className)} role="alert" {...props} />;
}
