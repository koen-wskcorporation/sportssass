import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getOrgPublicContext } from "@/lib/org/getOrgPublicContext";
import { executeFormBehavior } from "@/modules/forms/behavior/execute";
import {
  countRecentSubmissionAttempts,
  createAuditLog,
  createFormSubmission,
  getPublishedFormRuntimeBySlug,
  recordSubmissionAttempt
} from "@/modules/forms/db/queries";
import { extractSubmissionInputFromFormData, validateSubmission } from "@/modules/forms/logic";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 10;

function normalizeSlug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "form"
  );
}

function readClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const firstForwarded = forwardedFor?.split(",")[0]?.trim();

  if (firstForwarded) {
    return firstForwarded;
  }

  const realIp = request.headers.get("x-real-ip");

  if (realIp?.trim()) {
    return realIp.trim();
  }

  const cfIp = request.headers.get("cf-connecting-ip");

  if (cfIp?.trim()) {
    return cfIp.trim();
  }

  return "unknown";
}

function hashIp(ip: string, orgId: string, formId: string) {
  return createHash("sha256")
    .update(`${ip}|${orgId}|${formId}`)
    .digest("hex");
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{ orgSlug: string; slug: string }>;
  }
) {
  try {
    const { orgSlug, slug } = await context.params;
    const orgContext = await getOrgPublicContext(orgSlug);
    const form = await getPublishedFormRuntimeBySlug(orgContext.orgId, normalizeSlug(slug));

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

    const body = await request.formData();
    const honeypotValue = body.get(form.snapshot.ui.honeypotFieldName);
    const honeypotText = typeof honeypotValue === "string" ? honeypotValue.trim() : "";

    if (honeypotText.length > 0) {
      // Silent success to avoid exposing anti-spam controls.
      return NextResponse.json({
        ok: true,
        message: form.snapshot.ui.successMessage
      });
    }

    const clientIp = readClientIp(request);
    const ipHash = hashIp(clientIp, orgContext.orgId, form.id);
    const sinceIso = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const recentAttemptCount = await countRecentSubmissionAttempts({
      orgId: orgContext.orgId,
      formId: form.id,
      ipHash,
      sinceIso
    });

    if (recentAttemptCount >= RATE_LIMIT_MAX_ATTEMPTS) {
      return NextResponse.json(
        {
          ok: false,
          error: "Too many attempts. Please wait before submitting again."
        },
        {
          status: 429
        }
      );
    }

    await recordSubmissionAttempt({
      orgId: orgContext.orgId,
      formId: form.id,
      ipHash
    });

    const submissionInput = extractSubmissionInputFromFormData(body);
    const validation = validateSubmission(form.snapshot, submissionInput);

    if (!validation.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Fix the highlighted fields and try again.",
          errors: validation.errors
        },
        {
          status: 422
        }
      );
    }

    const submission = await createFormSubmission({
      orgId: orgContext.orgId,
      formId: form.id,
      versionId: form.versionId,
      answersJson: validation.answers,
      metadataJson: {
        ipHash,
        userAgent: request.headers.get("user-agent") ?? null,
        referer: request.headers.get("referer") ?? null,
        source: "public_form"
      }
    });

    await executeFormBehavior({
      orgId: orgContext.orgId,
      submission,
      behavior: form.snapshot.behavior
    });

    await createAuditLog({
      orgId: orgContext.orgId,
      action: "form.submitted",
      entityType: "form_submission",
      entityId: submission.id,
      detailJson: {
        formId: form.id,
        formSlug: form.slug,
        versionId: form.versionId
      }
    });

    return NextResponse.json({
      ok: true,
      message: form.snapshot.ui.successMessage
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Unable to submit right now. Please try again."
      },
      {
        status: 500
      }
    );
  }
}
