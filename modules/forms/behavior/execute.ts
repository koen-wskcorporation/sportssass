import { createAuditLog, upsertSponsorProfileFromSubmission } from "@/modules/forms/db/queries";
import type { FormBehaviorJson, FormSubmission } from "@/modules/forms/types";

type ExecuteFormBehaviorInput = {
  orgId: string;
  submission: FormSubmission;
  behavior: FormBehaviorJson;
  actorUserId?: string | null;
};

function readAnswerString(answers: Record<string, unknown>, key: string) {
  const raw = answers[key];

  if (typeof raw !== "string") {
    return "";
  }

  return raw.trim();
}

export async function executeFormBehavior({ orgId, submission, behavior, actorUserId = null }: ExecuteFormBehaviorInput) {
  if (behavior.type === "none") {
    return;
  }

  if (behavior.type === "sponsorship_intake") {
    const answers = submission.answersJson;
    const sponsorName = readAnswerString(answers, behavior.mapping.sponsorName) || "Sponsor";
    const websiteUrl = readAnswerString(answers, behavior.mapping.websiteUrl) || null;
    const tier = readAnswerString(answers, behavior.mapping.tier) || null;
    const logoAssetId = readAnswerString(answers, behavior.mapping.logoAssetId) || null;

    const sponsorProfile = await upsertSponsorProfileFromSubmission({
      orgId,
      submissionId: submission.id,
      name: sponsorName,
      websiteUrl,
      tier,
      logoAssetId
    });

    try {
      await createAuditLog({
        orgId,
        actorUserId,
        action: "sponsor_profile.pending_created",
        entityType: "sponsor_profile",
        entityId: sponsorProfile.id,
        detailJson: {
          submissionId: submission.id,
          sponsorName: sponsorProfile.name
        }
      });
    } catch {
      // Non-blocking: behavior completion should not fail on audit sink issues.
    }
  }
}
