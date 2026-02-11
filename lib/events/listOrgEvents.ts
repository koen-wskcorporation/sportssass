import { createSupabaseServerClient } from "@/lib/supabase/server";

export type OrgEvent = {
  id: string;
  tool_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

export async function listRecentOrgEvents(orgId: string, limit = 12): Promise<OrgEvent[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("org_events")
    .select("id, tool_id, event_type, entity_type, entity_id, payload, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to list org events: ${error.message}`);
  }

  return (data ?? []) as OrgEvent[];
}
