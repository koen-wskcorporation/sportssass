type OrgAdminAreaShellProps = {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  mobileSidebar: React.ReactNode;
};

export function OrgAdminAreaShell({ children, sidebar, mobileSidebar }: OrgAdminAreaShellProps) {
  return (
    <main className="app-container py-6 md:py-8">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)] lg:gap-6">
        <aside className="hidden lg:sticky lg:top-6 lg:block lg:w-[280px]">{sidebar}</aside>

        <div className="space-y-6">
          {mobileSidebar}
          {children}
        </div>
      </div>
    </main>
  );
}
