import * as React from "react";
import { cn } from "@/lib/utils";

type NavGroupProps = {
  children: React.ReactNode;
  className?: string;
  itemsClassName?: string;
  title: string;
  titleClassName?: string;
};

export function NavGroup({ children, className, itemsClassName, title, titleClassName }: NavGroupProps) {
  return (
    <section className={cn("space-y-2.5", className)}>
      <p className={cn("px-1 text-[12px] font-semibold text-text-muted", titleClassName)}>{title}</p>
      <div className={cn("space-y-1", itemsClassName)}>{children}</div>
    </section>
  );
}
