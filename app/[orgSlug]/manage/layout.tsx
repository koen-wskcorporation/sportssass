import { redirect } from "next/navigation";
import { OrgAdminAreaShell } from "@/components/manage/OrgAdminAreaShell";
import { ToolsSidebar, ToolsSidebarMobile } from "@/components/manage/ToolsSidebar";
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

  if (!capabilities.manage.canAccessArea) {
    redirect("/forbidden");
  }

  return (
    <OrgAdminAreaShell
      mobileSidebar={<ToolsSidebarMobile orgSlug={orgContext.orgSlug} />}
      sidebar={<ToolsSidebar orgSlug={orgContext.orgSlug} />}
    >
      {children}
    </OrgAdminAreaShell>
  );
}
