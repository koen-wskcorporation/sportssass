import type { Metadata } from "next";
import { ProgramManageDetailPage } from "../ProgramManageDetailPage";

export const metadata: Metadata = {
  title: "Program Teams"
};

export default async function ProgramTeamsPage({
  params
}: {
  params: Promise<{ orgSlug: string; programId: string }>;
}) {
  const { orgSlug, programId } = await params;
  return <ProgramManageDetailPage activeSection="teams" orgSlug={orgSlug} programId={programId} />;
}
