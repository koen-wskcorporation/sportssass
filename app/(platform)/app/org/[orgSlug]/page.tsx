import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireOrgPermission } from "@/lib/auth/requireOrgPermission";
import { listRecentOrgEvents } from "@/lib/events/listOrgEvents";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default async function OrgOverviewPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const orgContext = await requireOrgPermission(orgSlug, "org.dashboard.read");
  const events = await listRecentOrgEvents(orgContext.orgId);

  return (
    <div className="space-y-6">
      <PageHeader
        description="Cross-tool platform activity stream and organization health snapshot."
        title={`${orgContext.orgName} Overview`}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Tool Slots</CardTitle>
            <CardDescription>Architecture supports additional modules.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">1+</p>
            <p className="mt-1 text-sm text-muted-foreground">Add tools via registry + route module.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tenant Context</CardTitle>
            <CardDescription>Shared org context loaded globally per org workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold uppercase">{orgContext.membershipRole}</p>
            <p className="mt-1 text-sm text-muted-foreground">Current workspace role</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Events</CardTitle>
            <CardDescription>Unified `org_events` audit feed.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{events.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">Latest platform events</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Stream</CardTitle>
          <CardDescription>Standardized entity references (`entity_type`, `entity_id`) for cross-tool links.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Tool</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Entity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 ? (
                <TableRow>
                  <TableCell className="py-7 text-center text-muted-foreground" colSpan={4}>
                    No activity captured yet.
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>{formatDate(event.created_at)}</TableCell>
                    <TableCell>{event.tool_id}</TableCell>
                    <TableCell>{event.event_type}</TableCell>
                    <TableCell>{`${event.entity_type}:${event.entity_id}`}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
