import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { OrgAuthContext } from "@/lib/org/types";
import { SponsorStatusBadge } from "@/modules/sponsors/components/status-badge";
import { listSponsorProfilesForManage } from "@/modules/sponsors/db/queries";

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

type SponsorsListPageProps = {
  orgContext: OrgAuthContext;
  updated?: boolean;
};

export async function SponsorsListPage({ orgContext, updated = false }: SponsorsListPageProps) {
  const profiles = await listSponsorProfilesForManage(orgContext.orgId);

  return (
    <div className="space-y-6">
      <PageHeader description="Review sponsor intake profiles and publish approved partners." title="Sponsorship Profiles" />

      {updated ? <Alert variant="success">Sponsor profile updated successfully.</Alert> : null}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sponsor</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.length === 0 ? (
                <TableRow>
                  <TableCell className="py-8 text-center text-text-muted" colSpan={5}>
                    No sponsor profiles yet.
                  </TableCell>
                </TableRow>
              ) : (
                profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-semibold">
                      <p>{profile.name}</p>
                      <p className="text-xs text-text-muted">{profile.websiteUrl || "No website"}</p>
                    </TableCell>
                    <TableCell>{profile.tier || "-"}</TableCell>
                    <TableCell>
                      <SponsorStatusBadge status={profile.status} />
                    </TableCell>
                    <TableCell>{formatDate(profile.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <Link className={buttonVariants({ size: "sm", variant: "ghost" })} href={`/${orgContext.orgSlug}/tools/sponsors/manage/${profile.id}`}>
                        Review
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Link className={buttonVariants({ variant: "secondary" })} href={`/${orgContext.orgSlug}/forms/sponsorship-intake`}>
          Open Intake Form
        </Link>
        <Link className={buttonVariants({ variant: "ghost" })} href={`/${orgContext.orgSlug}/sponsors`}>
          View Public Directory
        </Link>
      </div>
    </div>
  );
}
