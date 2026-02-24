type UniversalAppShellProps = {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  mobileSidebar: React.ReactNode;
};

export function UniversalAppShell({ children, sidebar, mobileSidebar }: UniversalAppShellProps) {
  return (
    <main className="app-shell w-full px-6 py-3 md:px-8 md:py-4">
      <div className="grid items-start gap-5 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-6">
        <aside className="sticky top-36 z-30 hidden lg:block">{sidebar}</aside>

        <div className="min-w-0">
          <div className="sticky top-24 z-30 mb-4 lg:hidden">{mobileSidebar}</div>
          {children}
        </div>
      </div>
    </main>
  );
}
