import { createSupabaseServerClient } from "@/lib/supabase/server";

export type GoverningBodyOption = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string;
};

export async function listGoverningBodies(): Promise<GoverningBodyOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("governing_bodies").select("id, slug, name, logo_url").order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to list governing bodies: ${error.message}`);
  }

  return (data ?? []).map((body) => ({
    id: body.id,
    slug: body.slug,
    name: body.name,
    logoUrl: body.logo_url
  }));
}
