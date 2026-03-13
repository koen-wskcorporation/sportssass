import { PageHeader } from "@orgframe/ui/ui/page-header";
import { PageStack } from "@orgframe/ui/ui/layout";
import type { Metadata } from "next";
import { getAccountsAccessPageData } from "@/modules/manage-access/actions";
import { AccountsAccessPanel } from "@orgframe/ui/modules/manage-access/components/AccountsAccessPanel";

export const metadata: Metadata = {
  title: "User Accounts"
};

export default async function OrgMembersSettingsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const data = await getAccountsAccessPageData(orgSlug);

  return (
    <PageStack>
      <PageHeader
        description="Invite users, assign access roles, and handle account recovery."
        showBorder={false}
        title="User Accounts"
      />
      <AccountsAccessPanel
        currentUserPermissions={data.currentUserPermissions}
        currentUserRole={data.currentUserRole}
        loadError={data.loadError}
        members={data.members}
        orgSlug={data.orgSlug}
        roles={data.roles}
        serviceRoleConfigured={data.serviceRoleConfigured}
      />
    </PageStack>
  );
}
