import { redirect } from "next/navigation";

export default async function OrgSettingsIndexPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  redirect(`/app/o/${orgSlug}/settings/branding`);
}
