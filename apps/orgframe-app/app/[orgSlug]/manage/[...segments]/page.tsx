import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

function toQueryString(searchParams: SearchParams) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        query.append(key, item);
      }
      continue;
    }

    if (typeof value === "string") {
      query.set(key, value);
    }
  }

  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export default async function OrgManageSegmentsRedirectPage({
  params,
  searchParams
}: {
  params: Promise<{ orgSlug: string; segments: string[] }>;
  searchParams: Promise<SearchParams>;
}) {
  const { orgSlug, segments } = await params;
  const query = await searchParams;
  const suffix = segments.length > 0 ? `/${segments.join("/")}` : "";

  redirect(`/tools${suffix}${toQueryString(query)}`);
}
