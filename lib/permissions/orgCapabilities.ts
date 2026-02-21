import { can } from "@/lib/permissions/can";
import type { Permission } from "@/modules/core/access";

export type OrgCapabilities = {
  manage: {
    canRead: boolean;
    canAccessArea: boolean;
  };
  pages: {
    canRead: boolean;
    canWrite: boolean;
    canAccess: boolean;
  };
};

function resolveReadWriteAccess(permissions: Permission[], readPermission: Permission, writePermission: Permission) {
  const canWrite = can(permissions, writePermission);
  const canRead = canWrite || can(permissions, readPermission);

  return {
    canRead,
    canWrite,
    canAccess: canRead
  };
}

export function getOrgCapabilities(permissions: Permission[]): OrgCapabilities {
  const pages = resolveReadWriteAccess(permissions, "org.pages.read", "org.pages.write");
  const canManage = can(permissions, "org.manage.read");

  return {
    manage: {
      canRead: canManage,
      canAccessArea: canManage || pages.canAccess
    },
    pages
  };
}
