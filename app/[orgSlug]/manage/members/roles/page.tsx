import { PageHeader } from "@/components/ui/page-header";
import { getCustomRolesPageData } from "@/modules/manage-access/actions";
import { CustomRolesPanel } from "@/modules/manage-access/components/CustomRolesPanel";

export default async function OrgCustomRolesPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const data = await getCustomRolesPageData(orgSlug);

  return (
    <>
      <PageHeader
        description="Create and maintain reusable role templates for specialized responsibilities."
        title="Accounts & Access"
      />
      <CustomRolesPanel
        currentUserPermissions={data.currentUserPermissions}
        currentUserRole={data.currentUserRole}
        loadError={data.loadError}
        orgSlug={data.orgSlug}
        roles={data.roles}
        serviceRoleConfigured={data.serviceRoleConfigured}
      />
    </>
  );
}
