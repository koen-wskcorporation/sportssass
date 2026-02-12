import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import type { OrgRole } from "@/modules/core/tools/access";

export const getOptionalOrgMembershipRole = cache(async (orgId: string): Promise<OrgRole | null> => {
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data: membership, error } = await supabase
    .from("org_memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !membership) {
    return null;
  }

  return membership.role as OrgRole;
});
