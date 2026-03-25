import type { Metadata } from "next";
import { FacilityManageDetailPage } from "../FacilityManageDetailPage";

export const metadata: Metadata = {
  title: "Facility Settings"
};

export default async function OrgManageFacilitySettingsPage({
  params
}: {
  params: Promise<{ orgSlug: string; spaceId: string }>;
}) {
  const { orgSlug, spaceId } = await params;

  return <FacilityManageDetailPage activeSection="settings" orgSlug={orgSlug} spaceId={spaceId} />;
}
