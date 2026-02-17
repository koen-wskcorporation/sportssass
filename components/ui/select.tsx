import * as React from "react";
import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  options: SelectOption[];
};

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, options, ...props }, ref) => {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-control border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-55",
        className
      )}
      ref={ref}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
});
Select.displayName = "Select";

export { Select };
