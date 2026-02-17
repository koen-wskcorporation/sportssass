import type { SiteButton } from "@/lib/links";

export type OrgAnnouncement = {
  id: string;
  orgId: string;
  title: string;
  summary: string;
  button: SiteButton | null;
  publishAt: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};
