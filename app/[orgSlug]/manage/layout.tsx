import { redirect } from "next/navigation";
import { ManageSidebar, ManageSidebarMobile } from "@/components/manage/ManageSidebar";
import { OrgAdminAreaShell } from "@/components/manage/OrgAdminAreaShell";
import { getOrgAuthContext } from "@/lib/org/getOrgAuthContext";
import { getOrgCapabilities } from "@/lib/permissions/orgCapabilities";

export default async function OrgManageLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const orgContext = await getOrgAuthContext(orgSlug);
  const capabilities = getOrgCapabilities(orgContext.membershipPermissions);
  const canAccessManageArea = capabilities.manage.canAccessArea;

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
