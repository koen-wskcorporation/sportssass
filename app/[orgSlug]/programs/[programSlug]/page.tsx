import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getOrgAssetPublicUrl } from "@/lib/branding/getOrgAssetPublicUrl";
import { getOrgPublicContext } from "@/lib/org/getOrgPublicContext";
import { listPublishedFormsForProgram } from "@/modules/forms/db/queries";
import { getProgramDetailsBySlug } from "@/modules/programs/db/queries";

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ orgSlug: string; programSlug: string }>;
}): Promise<Metadata> {
  const { programSlug } = await params;
  return {
    title: titleFromSlug(programSlug) || "Program"
  };
}

function formatDateRange(startDate: string | null, endDate: string | null) {
  if (startDate && endDate) {
    return `${startDate} to ${endDate}`;
  }

  if (startDate) {
    return `Starts ${startDate}`;
  }

  if (endDate) {
    return `Ends ${endDate}`;
  }

  return "Dates to be announced";
}

function formatDays(values: number[] | null) {
  if (!values || values.length === 0) {
    return "No recurring days";
  }

  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return values.map((value) => labels[value] ?? "?").join(", ");
}

function formatSchedule(block: {
  blockType: "date_range" | "meeting_pattern" | "one_off";
  startDate: string | null;
  endDate: string | null;
  byDay: number[] | null;
  oneOffAt: string | null;
  startTime: string | null;
  endTime: string | null;
}) {
  if (block.blockType === "one_off") {
    return block.oneOffAt ?? "Date pending";
  }

  if (block.blockType === "meeting_pattern") {
    return `${formatDateRange(block.startDate, block.endDate)} · ${formatDays(block.byDay)}${
      block.startTime && block.endTime ? ` · ${block.startTime}-${block.endTime}` : ""
    }`;
  }

  return `${formatDateRange(block.startDate, block.endDate)}${
    block.startTime && block.endTime ? ` · ${block.startTime}-${block.endTime}` : ""
  }`;
}

export default async function OrgProgramDetailPage({
  params
}: {
  params: Promise<{ orgSlug: string; programSlug: string }>;
}) {
  const { orgSlug, programSlug } = await params;
  const org = await getOrgPublicContext(orgSlug);
  const details = await getProgramDetailsBySlug(org.orgId, programSlug, {
    includeDraft: false
  });

  if (!details) {
    notFound();
  }

  const forms = await listPublishedFormsForProgram(org.orgId, details.program.id);

  return (
    <main className="w-full px-6 py-8 md:px-8 md:py-10">
      <div className="space-y-6">
        <PageHeader
          description={details.program.description ?? "Program details and registration options."}
          title={details.program.name}
        />
        {details.program.coverImagePath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={`${details.program.name} cover`}
            className="h-64 w-full rounded-card border object-cover"
            src={getOrgAssetPublicUrl(details.program.coverImagePath) ?? ""}
          />
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Program details</CardTitle>
              <CardDescription>Availability window and taxonomy.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-text-muted">
              <p>Status: {details.program.status}</p>
              <p>Type: {details.program.programType === "custom" ? details.program.customTypeLabel ?? "Custom" : details.program.programType}</p>
              <p>{formatDateRange(details.program.startDate, details.program.endDate)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Registration</CardTitle>
              <CardDescription>Choose a published form to submit.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {forms.length === 0 ? <Alert variant="info">Registration is not open yet for this program.</Alert> : null}
              {forms.map((form) => (
                <div className="rounded-control border bg-surface px-3 py-3" key={form.id}>
                  <p className="font-semibold text-text">{form.name}</p>
                  <p className="text-xs text-text-muted">/{orgSlug}/register/{form.slug}</p>
                  <div className="mt-2">
                    <Link className={buttonVariants({ size: "sm" })} href={`/${orgSlug}/register/${form.slug}`}>
                      Register
                    </Link>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Divisions</CardTitle>
            <CardDescription>Program hierarchy and capacity planning.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {details.nodes.length === 0 ? <Alert variant="info">No divisions published yet.</Alert> : null}
            {details.nodes.map((node) => (
              <div className="rounded-control border bg-surface px-3 py-2 text-sm" key={node.id}>
                <p className="font-medium text-text">{node.name}</p>
                <p className="text-xs text-text-muted">
                  {node.nodeKind}
                  {typeof node.capacity === "number" ? ` · Capacity ${node.capacity}` : " · Open capacity"}
                  {node.waitlistEnabled ? " · Waitlist enabled" : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>Published timeline and recurring blocks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {details.scheduleBlocks.length === 0 ? <Alert variant="info">No schedule blocks yet.</Alert> : null}
            {details.scheduleBlocks.map((block) => (
              <div className="rounded-control border bg-surface px-3 py-2 text-sm" key={block.id}>
                <p className="font-medium text-text">{block.title ?? "Schedule block"}</p>
                <p className="text-xs text-text-muted">{formatSchedule(block)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
