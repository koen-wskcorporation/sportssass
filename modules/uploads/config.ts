import type { Permission } from "@/modules/core/access";
import type { UploadAspectMode, UploadPurpose } from "@/modules/uploads/types";

export type UploadPurposeConfig = {
  bucket: "org-assets" | "account-assets" | "org-site-assets";
  maxSizeMB: number;
  allowedExtensions: string[];
  orgPermission?: Permission;
  allowPublicOrg?: boolean;
  defaultAspect?: UploadAspectMode;
};

export const uploadPurposeConfigByPurpose: Record<UploadPurpose, UploadPurposeConfig> = {
  "org-logo": {
    bucket: "org-assets",
    maxSizeMB: 10,
    allowedExtensions: ["png", "jpg", "jpeg", "webp", "svg"],
    orgPermission: "org.branding.write",
    defaultAspect: "free"
  },
  "org-icon": {
    bucket: "org-assets",
    maxSizeMB: 10,
    allowedExtensions: ["png", "jpg", "jpeg", "webp", "svg", "ico"],
    orgPermission: "org.branding.write",
    defaultAspect: "square"
  },
  "profile-photo": {
    bucket: "account-assets",
    maxSizeMB: 5,
    allowedExtensions: ["png", "jpg", "jpeg", "webp", "svg"],
    defaultAspect: "square"
  },
  "site-hero": {
    bucket: "org-site-assets",
    maxSizeMB: 10,
    allowedExtensions: ["png", "jpg", "jpeg", "webp", "svg"],
    orgPermission: "org.pages.write",
    defaultAspect: "wide"
  },
  "site-block-image": {
    bucket: "org-site-assets",
    maxSizeMB: 10,
    allowedExtensions: ["png", "jpg", "jpeg", "webp", "svg"],
    orgPermission: "org.pages.write",
    defaultAspect: "wide"
  },
  attachment: {
    bucket: "org-site-assets",
    maxSizeMB: 10,
    allowedExtensions: ["pdf", "txt", "csv", "doc", "docx", "xls", "xlsx", "png", "jpg", "jpeg", "webp", "svg"],
    orgPermission: "org.manage.read",
    defaultAspect: "free"
  }
};
