export const sponsorSubmissionStatuses = ["submitted", "approved", "rejected", "paid"] as const;

export type SponsorSubmissionStatus = (typeof sponsorSubmissionStatuses)[number];

export type SponsorSubmission = {
  id: string;
  org_id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  website: string | null;
  message: string | null;
  logo_path: string | null;
  status: SponsorSubmissionStatus;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateSponsorSubmissionInput = {
  id: string;
  org_id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string | null;
  website?: string | null;
  message?: string | null;
  logo_path?: string | null;
};
