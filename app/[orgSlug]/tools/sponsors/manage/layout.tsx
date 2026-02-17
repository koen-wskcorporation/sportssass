import { requireOrgPermission } from "@/lib/permissions/requireOrgPermission";

export default async function SponsorsManageLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  await requireOrgPermission(orgSlug, "sponsors.read");

  return <>{children}</>;
}
