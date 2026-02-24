import { redirect } from "next/navigation";

export default async function OrgToolsHomePage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  redirect(`/${orgSlug}/tools/manage`);
}
