import { NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/permissions/requireOrgPermission";
import { getFormDefinitionById, getFormVersionById, listFormSubmissions } from "@/modules/forms/db/queries";

const validStatuses = new Set(["all", "submitted", "reviewed", "archived"]);

function csvEscape(value: string) {
  if (value.includes(",") || value.includes("\"") || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }

  return value;
}

function toCellValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).join(" | ");
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{ orgSlug: string; id: string }>;
  }
) {
  const { orgSlug, id } = await context.params;
  const searchParams = new URL(request.url).searchParams;
  const statusRaw = String(searchParams.get("status") ?? "all");
  const status = validStatuses.has(statusRaw) ? (statusRaw as "all" | "submitted" | "reviewed" | "archived") : "all";

  const orgContext = await requireOrgPermission(orgSlug, "forms.read");
  const [form, submissions] = await Promise.all([
    getFormDefinitionById(orgContext.orgId, id),
    listFormSubmissions(orgContext.orgId, {
      formId: id,
      status
    })
  ]);

  if (!form) {
    return NextResponse.json(
      {
        ok: false,
        error: "Form not found."
      },
      {
        status: 404
      }
    );
  }

  const uniqueVersionIds = [...new Set(submissions.map((submission) => submission.versionId))];
  const versions = await Promise.all(uniqueVersionIds.map((versionId) => getFormVersionById(orgContext.orgId, versionId)));
  const versionById = new Map(versions.filter((version): version is NonNullable<typeof version> => Boolean(version)).map((version) => [version.id, version]));

  const answerColumns = [...new Set(submissions.flatMap((submission) => Object.keys(submission.answersJson)))].sort((a, b) => a.localeCompare(b));

  const header = [
    "submission_id",
    "form_id",
    "form_slug",
    "form_name",
    "status",
    "created_at",
    "version_id",
    "version_number",
    ...answerColumns.map((column) => `answer.${column}`)
  ];

  const rows = submissions.map((submission) => {
    const version = versionById.get(submission.versionId);
    const base = [
      submission.id,
      submission.formId,
      form.slug,
      form.name,
      submission.status,
      submission.createdAt,
      submission.versionId,
      version ? String(version.versionNumber) : ""
    ];

    const answers = answerColumns.map((column) => toCellValue(submission.answersJson[column]));

    return [...base, ...answers];
  });

  const csv = [header, ...rows].map((row) => row.map((value) => csvEscape(String(value))).join(",")).join("\n");
  const filename = `${form.slug}-submissions-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store"
    }
  });
}
