import { notFound } from "next/navigation";
import { Alert } from "@orgframe/ui/ui/alert";
import { PageHeader } from "@orgframe/ui/ui/page-header";
import { ManageCalendarSection } from "@/app/[orgSlug]/manage/calendar/ManageCalendarSection";
import { getOrgRequestContext } from "@/lib/org/getOrgRequestContext";
import { can } from "@/lib/permissions/can";
import { getCalendarWorkspaceDataAction } from "@/modules/calendar/actions";
import { scopeCalendarReadModelByContext } from "@/modules/calendar/read-model-scope";
import { getProgramDetailsBySlug } from "@/modules/programs/db/queries";

type TeamCalendarPageProps = {
  params: Promise<{ orgSlug: string; programSlug: string; divisionSlug: string; teamSlug: string }>;
};

export default async function ProgramTeamCalendarPage({ params }: TeamCalendarPageProps) {
  const { orgSlug, programSlug, divisionSlug, teamSlug } = await params;
  const orgRequest = await getOrgRequestContext(orgSlug);

  const canReadPrograms = Boolean(
    orgRequest.membership &&
      (can(orgRequest.membership.permissions, "programs.read") ||
        can(orgRequest.membership.permissions, "programs.write") ||
        can(orgRequest.membership.permissions, "calendar.read") ||
        can(orgRequest.membership.permissions, "calendar.write"))
  );

  const canWritePrograms = Boolean(
    orgRequest.membership &&
      (can(orgRequest.membership.permissions, "programs.write") ||
        can(orgRequest.membership.permissions, "calendar.write") ||
        can(orgRequest.membership.permissions, "org.manage.read"))
  );

  const details = await getProgramDetailsBySlug(orgRequest.org.orgId, programSlug, { includeDraft: false });
  if (!details) {
    notFound();
  }

  const division = details.nodes.find((node) => node.nodeKind === "division" && node.slug === divisionSlug);
  if (!division) {
    notFound();
  }

  const team = details.nodes.find((node) => node.nodeKind === "team" && node.slug === teamSlug && node.parentId === division.id);
  if (!team) {
    notFound();
  }

  const workspaceData = canReadPrograms ? await getCalendarWorkspaceDataAction({ orgSlug }) : null;
  const scopedReadModel =
    workspaceData?.ok
      ? scopeCalendarReadModelByContext({
          readModel: workspaceData.data.readModel,
          teamId: team.id
        })
      : null;

  return (
    <main className="app-page-shell w-full pb-8 pt-0 md:pb-10 md:pt-0">
      <div className="ui-stack-page">
        <PageHeader description={`Team in ${division.name}.`} title={team.name} />
        {!canReadPrograms ? <Alert variant="info">Team calendar visibility is limited to team staff.</Alert> : null}
        {canReadPrograms && workspaceData?.ok && scopedReadModel ? (
          <ManageCalendarSection
            activeTeams={workspaceData.data.activeTeams}
            canWrite={canWritePrograms}
            initialFacilityReadModel={workspaceData.data.facilityReadModel}
            initialReadModel={scopedReadModel}
            orgSlug={orgSlug}
          />
        ) : null}
      </div>
    </main>
  );
}
