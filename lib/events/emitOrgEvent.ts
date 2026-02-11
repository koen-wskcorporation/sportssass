import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

type EmitOrgEventInput = {
  orgId: string;
  toolId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown>;
};

export async function emitOrgEvent({
  orgId,
  toolId,
  eventType,
  entityType,
  entityId,
  payload = {}
}: EmitOrgEventInput) {
  const supabase = createSupabaseServiceRoleClient();

  const { error } = await supabase.from("org_events").insert({
    org_id: orgId,
    tool_id: toolId,
    event_type: eventType,
    entity_type: entityType,
    entity_id: entityId,
    payload
  });

  if (error) {
    throw new Error(`Failed to emit org event: ${error.message}`);
  }
}
