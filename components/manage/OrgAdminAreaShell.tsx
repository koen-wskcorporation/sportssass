type OrgAdminAreaShellProps = {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  mobileSidebar: React.ReactNode;
};

export function OrgAdminAreaShell({ children, sidebar, mobileSidebar }: OrgAdminAreaShellProps) {
  return (
    <main className="app-container py-3 md:py-4">
      <div className="grid items-start gap-5 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-6">
        <aside className="hidden lg:block">
          <div className="sticky top-36 z-30 h-fit max-h-[calc(100vh-10rem)] overflow-y-auto pr-1">{sidebar}</div>
        </aside>

        <div>
          <div className="sticky top-24 z-30 mb-4 lg:hidden">{mobileSidebar}</div>
          {children}
        </div>
      </div>
    </main>
  );
}
