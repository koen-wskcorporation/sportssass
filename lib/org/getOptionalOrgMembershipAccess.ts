import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { resolveOrgRolePermissions } from "@/lib/org/customRoles";
import type { OrgRole, Permission } from "@/modules/core/tools/access";

export type OrgMembershipAccess = {
  role: OrgRole;
  permissions: Permission[];
};

export const getOptionalOrgMembershipAccess = cache(async (orgId: string): Promise<OrgMembershipAccess | null> => {
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

  const role = membership.role as OrgRole;
  const permissions = await resolveOrgRolePermissions(supabase, orgId, role);

  return {
    role,
    permissions
  };
});
