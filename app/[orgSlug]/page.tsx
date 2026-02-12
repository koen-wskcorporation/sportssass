import { renderOrgPage } from "@/modules/site-builder/server/renderOrgPage";

export default async function OrgPublicHomePage({
  params,
  searchParams
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { orgSlug } = await params;
  const query = await searchParams;

  return renderOrgPage({
    orgSlug,
    pageKey: "home",
    searchParams: query
  });
}
