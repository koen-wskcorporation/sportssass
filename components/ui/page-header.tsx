import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  showBorder?: boolean;
};

export function PageHeader({ title, description, actions, className, showBorder = true }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 pb-5 md:flex-row md:items-end md:justify-between", showBorder ? "border-b" : "", className)}>
      <div>
        <h1 className="text-3xl font-semibold leading-tight text-text">{title}</h1>
        {description ? <p className="mt-1 text-sm text-text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
