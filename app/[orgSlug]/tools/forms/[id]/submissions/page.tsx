import { notFound } from "next/navigation";
import { requireOrgPermission } from "@/lib/permissions/requireOrgPermission";
import { FormSubmissionsPage } from "@/modules/forms/components/FormSubmissionsPage";
import { getFormDefinitionById, getFormVersionById, listFormDefinitions, listFormSubmissions } from "@/modules/forms/db/queries";

type SubmissionsSearchParams = {
  status?: string;
  submission?: string;
};

const validStatuses = new Set(["all", "submitted", "reviewed", "archived"]);

export default async function OrgFormSubmissionsPage({
  params,
  searchParams
}: {
  params: Promise<{ orgSlug: string; id: string }>;
  searchParams: Promise<SubmissionsSearchParams>;
}) {
  const { orgSlug, id } = await params;
  const query = await searchParams;
  const selectedStatus = validStatuses.has(String(query.status ?? "all")) ? (String(query.status ?? "all") as "all" | "submitted" | "reviewed" | "archived") : "all";

  const orgContext = await requireOrgPermission(orgSlug, "forms.read");
  const [form, definitions, submissions] = await Promise.all([
    getFormDefinitionById(orgContext.orgId, id),
    listFormDefinitions(orgContext.orgId),
    listFormSubmissions(orgContext.orgId, {
      formId: id,
      status: selectedStatus
    })
  ]);

  if (!form) {
    notFound();
  }

  const uniqueVersionIds = [...new Set(submissions.map((submission) => submission.versionId))];
  const versions = await Promise.all(uniqueVersionIds.map((versionId) => getFormVersionById(orgContext.orgId, versionId)));
  const versionsById = Object.fromEntries(versions.filter((version): version is NonNullable<typeof version> => Boolean(version)).map((version) => [version.id, version]));

  return (
    <FormSubmissionsPage
      form={form}
      forms={definitions.map((definition) => ({
        id: definition.id,
        name: definition.name
      }))}
      orgSlug={orgContext.orgSlug}
      selectedStatus={selectedStatus}
      selectedSubmissionId={typeof query.submission === "string" ? query.submission : null}
      submissions={submissions}
      versionsById={versionsById}
    />
  );
}
