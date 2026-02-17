import { redirect } from "next/navigation";
import { ManageSidebar, ManageSidebarMobile } from "@/components/manage/ManageSidebar";
import { OrgAdminAreaShell } from "@/components/manage/OrgAdminAreaShell";
import { getOrgAuthContext } from "@/lib/org/getOrgAuthContext";
import { can } from "@/lib/permissions/can";

export default async function OrgManageLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const orgContext = await getOrgAuthContext(orgSlug);

  const canAccessManageArea =
    can(orgContext.membershipPermissions, "org.manage.read") ||
    can(orgContext.membershipPermissions, "org.pages.read") ||
    can(orgContext.membershipPermissions, "org.pages.write");

  if (!canAccessManageArea) {
    redirect("/forbidden");
  }

  return (
    <OrgAdminAreaShell
      mobileSidebar={<ManageSidebarMobile orgSlug={orgContext.orgSlug} />}
      sidebar={<ManageSidebar orgSlug={orgContext.orgSlug} />}
    >
      {children}
    </OrgAdminAreaShell>
  );
}
