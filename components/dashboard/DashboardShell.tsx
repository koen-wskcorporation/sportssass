import { PageHeader } from "@/components/ui/page-header";

type DashboardShellProps = {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

type DashboardSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function DashboardShell({ title, subtitle, actions, children }: DashboardShellProps) {
  return (
    <main className="app-container py-8 md:py-10">
      <div className="space-y-8">
        <PageHeader actions={actions} description={subtitle} title={title} />
        <div className="space-y-8">{children}</div>
      </div>
    </main>
  );
}

export function DashboardSection({ title, description, children }: DashboardSectionProps) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-text">{title}</h2>
        {description ? <p className="text-sm text-text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
