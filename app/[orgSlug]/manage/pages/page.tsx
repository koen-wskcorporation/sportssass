import { redirect } from "next/navigation";
import { getOrgAuthContext } from "@/lib/org/getOrgAuthContext";
import { can } from "@/lib/permissions/can";
import { listOrgPagesForManage } from "@/modules/site-builder/db/queries";
import { listOrgNavItems } from "@/modules/site-builder/db/nav-queries";
import { ManagePagesPage } from "@/modules/site-builder/components/ManagePagesPage";
import { createDefaultOrgNavItems } from "@/modules/site-builder/nav";

export default async function OrgManagePagesPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const orgContext = await getOrgAuthContext(orgSlug);

  const canReadPages = can(orgContext.membershipPermissions, "org.pages.read") || can(orgContext.membershipPermissions, "org.pages.write");

  if (!canReadPages) {
    redirect("/forbidden");
  }

  const [pages, navItems] = await Promise.all([
    listOrgPagesForManage(orgContext.orgId),
    listOrgNavItems(orgContext.orgId).catch(() => createDefaultOrgNavItems())
  ]);

  return <ManagePagesPage canWrite={can(orgContext.membershipPermissions, "org.pages.write")} navItems={navItems} orgSlug={orgContext.orgSlug} pages={pages} />;
}
