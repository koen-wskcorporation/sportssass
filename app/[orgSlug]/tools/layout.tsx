import { redirect } from "next/navigation";
import { OrgAdminAreaShell } from "@/components/manage/OrgAdminAreaShell";
import { ToolsSidebar, ToolsSidebarMobile } from "@/components/manage/ToolsSidebar";
import { getOrgAuthContext } from "@/lib/org/getOrgAuthContext";
import { can } from "@/lib/permissions/can";

function hasToolsAccess(permissions: Parameters<typeof can>[0]) {
  return (
    can(permissions, "org.manage.read") ||
    can(permissions, "forms.read") ||
    can(permissions, "forms.write") ||
    can(permissions, "sponsors.read") ||
    can(permissions, "sponsors.write") ||
    can(permissions, "announcements.read") ||
    can(permissions, "announcements.write")
  );
}

export default async function OrgToolsLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const orgContext = await getOrgAuthContext(orgSlug);

  if (!hasToolsAccess(orgContext.membershipPermissions)) {
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
