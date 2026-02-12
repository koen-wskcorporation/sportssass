import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { listSponsorSubmissions } from "@/modules/sponsors/db/queries";
import { SponsorStatusBadge } from "@/modules/sponsors/components/status-badge";
import type { OrgAuthContext } from "@/lib/org/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

type SponsorsListPageProps = {
  orgContext: OrgAuthContext;
  updated?: boolean;
};

export async function SponsorsListPage({ orgContext, updated = false }: SponsorsListPageProps) {
  const submissions = await listSponsorSubmissions(orgContext.orgId);

  return (
    <div className="space-y-6">
      <PageHeader
        description="Manage pipeline status, notes, and payout progression for sponsor submissions."
        title="Sponsorship Submissions"
      />

      {updated ? <Alert variant="success">Submission updated successfully.</Alert> : null}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Primary Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.length === 0 ? (
                <TableRow>
                  <TableCell className="py-8 text-center text-muted-foreground" colSpan={5}>
                    No submissions yet.
                  </TableCell>
                </TableRow>
              ) : (
                submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-semibold">{submission.company_name}</TableCell>
                    <TableCell>
                      <p>{submission.contact_name}</p>
                      <p className="text-xs text-muted-foreground">{submission.contact_email}</p>
                    </TableCell>
                    <TableCell>
                      <SponsorStatusBadge status={submission.status} />
                    </TableCell>
                    <TableCell>{formatDate(submission.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        className={buttonVariants({ size: "sm", variant: "ghost" })}
                        href={`/${orgContext.orgSlug}/sponsors/manage/${submission.id}`}
                      >
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

      <div className="flex justify-end">
        <Link className={buttonVariants({ variant: "secondary" })} href={`/${orgContext.orgSlug}/sponsors`}>
          View Public Form
        </Link>
      </div>
    </div>
  );
}
