import { emitOrgEvent } from "@/lib/events/emitOrgEvent";
import type { SponsorSubmissionStatus } from "@/modules/sponsors/types";

type SponsorEventBase = {
  orgId: string;
  submissionId: string;
  companyName: string;
  actorUserId?: string;
};

export async function emitSponsorSubmissionCreated({
  orgId,
  submissionId,
  companyName,
  actorUserId
}: SponsorEventBase) {
  await emitOrgEvent({
    orgId,
    toolId: "sponsors",
    eventType: "submission.created",
    entityType: "sponsor_submission",
    entityId: submissionId,
    payload: {
      companyName,
      actorUserId
    }
  });
}

export async function emitSponsorSubmissionStatusChanged({
  orgId,
  submissionId,
  companyName,
  actorUserId,
  status
}: SponsorEventBase & { status: SponsorSubmissionStatus }) {
  if (!["approved", "rejected", "paid"].includes(status)) {
    return;
  }

  await emitOrgEvent({
    orgId,
    toolId: "sponsors",
    eventType: `submission.${status}`,
    entityType: "sponsor_submission",
    entityId: submissionId,
    payload: {
      companyName,
      actorUserId
    }
  });
}

export async function emitSponsorSubmissionNotesUpdated({
  orgId,
  submissionId,
  companyName,
  actorUserId
}: SponsorEventBase) {
  await emitOrgEvent({
    orgId,
    toolId: "sponsors",
    eventType: "submission.notes_updated",
    entityType: "sponsor_submission",
    entityId: submissionId,
    payload: {
      companyName,
      actorUserId
    }
  });
}

export async function emitSponsorSubmissionAssetUploaded({
  orgId,
  submissionId,
  companyName,
  actorUserId
}: SponsorEventBase) {
  await emitOrgEvent({
    orgId,
    toolId: "sponsors",
    eventType: "submission.asset_uploaded",
    entityType: "sponsor_submission",
    entityId: submissionId,
    payload: {
      companyName,
      actorUserId
    }
  });
}
