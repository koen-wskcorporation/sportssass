import { PageHeader } from "@/components/ui/page-header";
import { getAnnouncementsManagePageData } from "@/modules/announcements/actions";
import { AnnouncementsManagePanel } from "@/modules/announcements/components/AnnouncementsManagePanel";

export default async function OrgAnnouncementsToolPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const data = await getAnnouncementsManagePageData(orgSlug);

  return (
    <>
      <PageHeader description="Create, schedule, and publish announcements for your organization site." title="Announcements" />
      <AnnouncementsManagePanel announcements={data.announcements} orgSlug={data.orgSlug} />
    </>
  );
}
