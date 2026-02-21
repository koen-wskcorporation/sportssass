export default function OrgRouteLoading() {
  return (
    <main className="app-container py-6">
      <div className="space-y-4">
        <div className="h-10 w-56 animate-pulse rounded-control bg-surface-muted" />
        <div className="h-40 animate-pulse rounded-card border bg-surface-muted" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-28 animate-pulse rounded-card border bg-surface-muted" />
          <div className="h-28 animate-pulse rounded-card border bg-surface-muted" />
        </div>
      </div>
    </main>
  );
}
