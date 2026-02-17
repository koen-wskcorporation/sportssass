"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { z } from "zod";
import { rethrowIfNavigationError } from "@/lib/actions/rethrowIfNavigationError";
import { findOrgCustomRoleByKey, listOrgCustomRoles, type OrgCustomRole } from "@/lib/org/customRoles";
import { getOrgAuthContext } from "@/lib/org/getOrgAuthContext";
import { requirePermission } from "@/lib/auth/requirePermission";
import { createOptionalSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import {
  allPermissions,
  getDefaultRoleLabel,
  getDefaultRolePermissions,
  isPermission,
  isReservedOrgRoleKey,
  isValidRoleKey,
  normalizeRoleKey,
  type OrgRole,
  type Permission
} from "@/modules/core/tools/access";

const roleKeySchema = z.string().trim().min(2).max(32);
const membershipRoleSchema = z.object({
  role: roleKeySchema
});

const membershipRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: roleKeySchema,
  created_at: z.string().optional().nullable()
});

const inviteUserSchema = z.object({
  orgSlug: z.string().trim().min(1),
  email: z.string().trim().email(),
  role: roleKeySchema
});

const updateMembershipRoleSchema = z.object({
  orgSlug: z.string().trim().min(1),
  membershipId: z.string().uuid(),
  role: roleKeySchema
});

const createCustomRoleSchema = z.object({
  orgSlug: z.string().trim().min(1),
  label: z.string().trim().min(2).max(64),
  permissions: z.array(z.string()).max(allPermissions.length)
});

const removeMembershipSchema = z.object({
  orgSlug: z.string().trim().min(1),
  membershipId: z.string().uuid()
});

const sendPasswordResetSchema = z.object({
  orgSlug: z.string().trim().min(1),
  email: z.string().trim().email(),
  redirectTo: z.string().trim().url().optional()
});

type ManageAccessErrorCode =
  | "invalid_input"
  | "invalid_role"
  | "duplicate_role"
  | "service_not_configured"
  | "not_found"
  | "already_member"
  | "forbidden"
  | "last_admin"
  | "action_failed";

type ManageAccessResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      code: ManageAccessErrorCode;
      error: string;
    };

export type AccessMember = {
  membershipId: string;
  userId: string;
  email: string | null;
  role: OrgRole;
  status: "active" | "pending";
  isCurrentUser: boolean;
  joinedAt: string | null;
  lastActivityAt: string | null;
};

export type AccessRoleDefinition = {
  id: string;
  roleKey: OrgRole;
  label: string;
  source: "default" | "custom";
  permissions: Permission[];
  createdAt: string | null;
};

export type AccountsAccessPageData = {
  orgSlug: string;
  orgName: string;
  currentUserId: string;
  currentUserRole: OrgRole;
  currentUserPermissions: Permission[];
  members: AccessMember[];
  roles: AccessRoleDefinition[];
  serviceRoleConfigured: boolean;
  loadError: string | null;
};

export type CustomRolesPageData = {
  orgSlug: string;
  orgName: string;
  currentUserRole: OrgRole;
  currentUserPermissions: Permission[];
  roles: AccessRoleDefinition[];
  serviceRoleConfigured: boolean;
  loadError: string | null;
};

type MembershipRow = z.infer<typeof membershipRowSchema>;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getConfiguredServiceClient() {
  return createOptionalSupabaseServiceRoleClient();
}

function asFailure(code: ManageAccessErrorCode, error: string): ManageAccessResult {
  return {
    ok: false,
    code,
    error
  };
}

function normalizePermissionSelection(selection: string[]): Permission[] {
  const raw = new Set(selection);

  return allPermissions.filter((permission) => raw.has(permission) && isPermission(permission));
}

function buildRoleDefinitions(customRoles: OrgCustomRole[]): AccessRoleDefinition[] {
  const adminPermissions = getDefaultRolePermissions("admin") ?? [];
  const memberPermissions = getDefaultRolePermissions("member") ?? [];
  const customDefinitions = [...customRoles]
    .sort((left, right) => left.label.localeCompare(right.label))
    .map((role) => ({
      id: role.id,
      roleKey: role.roleKey,
      label: role.label,
      source: "custom" as const,
      permissions: role.permissions,
      createdAt: role.createdAt
    }));

  return [
    {
      id: "role-admin",
      roleKey: "admin",
      label: getDefaultRoleLabel("admin"),
      source: "default",
      permissions: adminPermissions,
      createdAt: null
    },
    {
      id: "role-member",
      roleKey: "member",
      label: getDefaultRoleLabel("member"),
      source: "default",
      permissions: memberPermissions,
      createdAt: null
    },
    ...customDefinitions
  ];
}

function getRoleDefinitionMap(roles: AccessRoleDefinition[]) {
  return new Map(roles.map((role) => [role.roleKey, role]));
}

async function listAssignableRoles(supabase: SupabaseClient<any>, orgId: string): Promise<AccessRoleDefinition[]> {
  const customRoles = await listOrgCustomRoles(supabase, orgId);
  return buildRoleDefinitions(customRoles);
}

async function requireManageAccessContext(orgSlug: string) {
  const orgContext = await getOrgAuthContext(orgSlug);
  requirePermission(orgContext.membershipPermissions, "org.manage.read");
  return orgContext;
}

async function listOrgMembershipRows(supabase: SupabaseClient<any>, orgId: string): Promise<MembershipRow[]> {
  const { data, error } = await supabase
    .from("org_memberships")
    .select("id, user_id, role, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).flatMap((row) => {
    const parsed = membershipRowSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
}

async function findMembershipById(supabase: SupabaseClient<any>, orgId: string, membershipId: string): Promise<MembershipRow | null> {
  const { data, error } = await supabase
    .from("org_memberships")
    .select("id, user_id, role, created_at")
    .eq("org_id", orgId)
    .eq("id", membershipId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const parsed = membershipRowSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

async function membershipExists(supabase: SupabaseClient<any>, orgId: string, userId: string) {
  const { data, error } = await supabase
    .from("org_memberships")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data?.id);
}

async function countAdmins(supabase: SupabaseClient<any>, orgId: string) {
  const { count, error } = await supabase.from("org_memberships").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("role", "admin");

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

function getMemberStatus(user: User | null): AccessMember["status"] {
  if (!user) {
    return "pending";
  }

  if (user.last_sign_in_at || user.email_confirmed_at) {
    return "active";
  }

  if (user.invited_at) {
    return "pending";
  }

  return "active";
}

async function findAuthUserByEmail(supabase: SupabaseClient<any>, email: string): Promise<User | null> {
  const targetEmail = normalizeEmail(email);
  const perPage = 200;

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage
    });

    if (error) {
      throw new Error(error.message);
    }

    const found = data.users.find((user) => normalizeEmail(user.email ?? "") === targetEmail);
    if (found) {
      return found;
    }

    if (data.users.length < perPage) {
      break;
    }
  }

  return null;
}

function validateRoleKey(roleKey: string) {
  if (!isValidRoleKey(roleKey)) {
    return false;
  }

  const parsed = membershipRoleSchema.safeParse({
    role: roleKey
  });

  return parsed.success;
}

export async function getAccountsAccessPageData(orgSlug: string): Promise<AccountsAccessPageData> {
  const orgContext = await requireManageAccessContext(orgSlug);
  const supabase = getConfiguredServiceClient();
  const defaultRoles = buildRoleDefinitions([]);

  if (!supabase) {
    return {
      orgSlug: orgContext.orgSlug,
      orgName: orgContext.orgName,
      currentUserId: orgContext.userId,
      currentUserRole: orgContext.membershipRole,
      currentUserPermissions: orgContext.membershipPermissions,
      members: [],
      roles: defaultRoles,
      serviceRoleConfigured: false,
      loadError: "Service role key is not configured. Set SUPABASE_SERVICE_ROLE_KEY on the server."
    };
  }

  try {
    const [memberships, roles] = await Promise.all([listOrgMembershipRows(supabase, orgContext.orgId), listAssignableRoles(supabase, orgContext.orgId)]);

    const members = await Promise.all(
      memberships.map(async (membership): Promise<AccessMember> => {
        const { data, error } = await supabase.auth.admin.getUserById(membership.user_id);
        const user = error ? null : data.user;

        return {
          membershipId: membership.id,
          userId: membership.user_id,
          email: user?.email ?? null,
          role: membership.role,
          status: getMemberStatus(user),
          isCurrentUser: membership.user_id === orgContext.userId,
          joinedAt: membership.created_at ?? null,
          lastActivityAt: user?.last_sign_in_at ?? user?.invited_at ?? user?.created_at ?? null
        };
      })
    );

    return {
      orgSlug: orgContext.orgSlug,
      orgName: orgContext.orgName,
      currentUserId: orgContext.userId,
      currentUserRole: orgContext.membershipRole,
      currentUserPermissions: orgContext.membershipPermissions,
      members,
      roles,
      serviceRoleConfigured: true,
      loadError: null
    };
  } catch {
    return {
      orgSlug: orgContext.orgSlug,
      orgName: orgContext.orgName,
      currentUserId: orgContext.userId,
      currentUserRole: orgContext.membershipRole,
      currentUserPermissions: orgContext.membershipPermissions,
      members: [],
      roles: defaultRoles,
      serviceRoleConfigured: true,
      loadError: "Unable to load org memberships right now."
    };
  }
}

export async function getCustomRolesPageData(orgSlug: string): Promise<CustomRolesPageData> {
  const orgContext = await requireManageAccessContext(orgSlug);
  const supabase = getConfiguredServiceClient();
  const defaultRoles = buildRoleDefinitions([]);

  if (!supabase) {
    return {
      orgSlug: orgContext.orgSlug,
      orgName: orgContext.orgName,
      currentUserRole: orgContext.membershipRole,
      currentUserPermissions: orgContext.membershipPermissions,
      roles: defaultRoles,
      serviceRoleConfigured: false,
      loadError: "Service role key is not configured. Set SUPABASE_SERVICE_ROLE_KEY on the server."
    };
  }

  try {
    const roles = await listAssignableRoles(supabase, orgContext.orgId);

    return {
      orgSlug: orgContext.orgSlug,
      orgName: orgContext.orgName,
      currentUserRole: orgContext.membershipRole,
      currentUserPermissions: orgContext.membershipPermissions,
      roles,
      serviceRoleConfigured: true,
      loadError: null
    };
  } catch {
    return {
      orgSlug: orgContext.orgSlug,
      orgName: orgContext.orgName,
      currentUserRole: orgContext.membershipRole,
      currentUserPermissions: orgContext.membershipPermissions,
      roles: defaultRoles,
      serviceRoleConfigured: true,
      loadError: "Unable to load custom roles right now."
    };
  }
}

export async function inviteUserToOrgAction(input: {
  orgSlug: string;
  email: string;
  role: OrgRole;
}): Promise<ManageAccessResult> {
  const parsedInput = inviteUserSchema.safeParse(input);

  if (!parsedInput.success) {
    return asFailure("invalid_input", "Please provide a valid email and role.");
  }

  try {
    const { orgSlug, email, role } = parsedInput.data;
    const orgContext = await requireManageAccessContext(orgSlug);
    const supabase = getConfiguredServiceClient();

    if (!supabase) {
      return asFailure("service_not_configured", "Invites require SUPABASE_SERVICE_ROLE_KEY on the server.");
    }

    if (!validateRoleKey(role)) {
      return asFailure("invalid_role", "Please select a valid role.");
    }

    const assignableRoles = await listAssignableRoles(supabase, orgContext.orgId);
    const roleDefinitions = getRoleDefinitionMap(assignableRoles);

    if (!roleDefinitions.has(role)) {
      return asFailure("invalid_role", "Please select a valid role.");
    }

    const existingUser = await findAuthUserByEmail(supabase, email);

    if (existingUser && (await membershipExists(supabase, orgContext.orgId, existingUser.id))) {
      return asFailure("already_member", "That user already has access to this organization.");
    }

    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email);

    if (inviteError && !existingUser) {
      return asFailure("action_failed", inviteError.message);
    }

    let userId = inviteData.user?.id ?? existingUser?.id ?? null;

    if (!userId) {
      const matchedUser = await findAuthUserByEmail(supabase, email);
      userId = matchedUser?.id ?? null;
    }

    if (!userId) {
      return asFailure("action_failed", "Unable to resolve invited user.");
    }

    if (await membershipExists(supabase, orgContext.orgId, userId)) {
      return asFailure("already_member", "That user already has access to this organization.");
    }

    const { error: insertError } = await supabase.from("org_memberships").insert({
      org_id: orgContext.orgId,
      user_id: userId,
      role
    });

    if (insertError) {
      return asFailure("action_failed", insertError.message);
    }

    revalidatePath(`/${orgSlug}/manage/members`);

    return { ok: true };
  } catch (error) {
    rethrowIfNavigationError(error);
    return asFailure("action_failed", "Unable to send invite right now.");
  }
}

export async function updateMembershipRoleAction(input: {
  orgSlug: string;
  membershipId: string;
  role: OrgRole;
}): Promise<ManageAccessResult> {
  const parsedInput = updateMembershipRoleSchema.safeParse(input);

  if (!parsedInput.success) {
    return asFailure("invalid_input", "Please select a valid role.");
  }

  try {
    const { orgSlug, membershipId, role } = parsedInput.data;
    const orgContext = await requireManageAccessContext(orgSlug);
    const supabase = getConfiguredServiceClient();

    if (!supabase) {
      return asFailure("service_not_configured", "Role updates require SUPABASE_SERVICE_ROLE_KEY on the server.");
    }

    if (!validateRoleKey(role)) {
      return asFailure("invalid_role", "Please select a valid role.");
    }

    const assignableRoles = await listAssignableRoles(supabase, orgContext.orgId);
    const roleDefinitions = getRoleDefinitionMap(assignableRoles);

    if (!roleDefinitions.has(role)) {
      return asFailure("invalid_role", "Please select a valid role.");
    }

    const membership = await findMembershipById(supabase, orgContext.orgId, membershipId);

    if (!membership) {
      return asFailure("not_found", "Membership not found.");
    }

    if (membership.role === role) {
      return { ok: true };
    }

    const actorIsAdmin = orgContext.membershipRole === "admin";
    const targetIsAdmin = membership.role === "admin";
    const assigningAdminRole = role === "admin";

    if ((targetIsAdmin || assigningAdminRole) && !actorIsAdmin) {
      return asFailure("forbidden", "Only organization admins can assign or modify admin roles.");
    }

    if (targetIsAdmin && role !== "admin") {
      const adminCount = await countAdmins(supabase, orgContext.orgId);

      if (adminCount <= 1) {
        return asFailure("last_admin", "This organization must keep at least one admin.");
      }
    }

    const { error: updateError } = await supabase
      .from("org_memberships")
      .update({
        role
      })
      .eq("org_id", orgContext.orgId)
      .eq("id", membershipId);

    if (updateError) {
      return asFailure("action_failed", updateError.message);
    }

    revalidatePath(`/${orgSlug}/manage/members`);

    return { ok: true };
  } catch (error) {
    rethrowIfNavigationError(error);
    return asFailure("action_failed", "Unable to update this membership right now.");
  }
}

export async function createCustomRoleAction(input: {
  orgSlug: string;
  label: string;
  permissions: string[];
}): Promise<ManageAccessResult> {
  const parsedInput = createCustomRoleSchema.safeParse(input);

  if (!parsedInput.success) {
    return asFailure("invalid_input", "Please provide a role name and at least one permission.");
  }

  try {
    const { orgSlug, label, permissions } = parsedInput.data;
    const orgContext = await requireManageAccessContext(orgSlug);
    const supabase = getConfiguredServiceClient();

    if (!supabase) {
      return asFailure("service_not_configured", "Custom roles require SUPABASE_SERVICE_ROLE_KEY on the server.");
    }

    if (orgContext.membershipRole !== "admin") {
      return asFailure("forbidden", "Only organization admins can create custom roles.");
    }

    const roleKey = normalizeRoleKey(label);

    if (!validateRoleKey(roleKey)) {
      return asFailure("invalid_input", "Role name must include at least two letters or numbers.");
    }

    if (isReservedOrgRoleKey(roleKey)) {
      return asFailure("invalid_input", "That role name conflicts with a default role.");
    }

    const selectedPermissions = normalizePermissionSelection(permissions);

    if (selectedPermissions.length === 0) {
      return asFailure("invalid_input", "Choose at least one permission for this role.");
    }

    const existingRole = await findOrgCustomRoleByKey(supabase, orgContext.orgId, roleKey);

    if (existingRole) {
      return asFailure("duplicate_role", "A role with that name already exists.");
    }

    const { error } = await supabase.from("org_custom_roles").insert({
      org_id: orgContext.orgId,
      role_key: roleKey,
      label: label.trim(),
      permissions: selectedPermissions
    });

    if (error) {
      return asFailure("action_failed", error.message);
    }

    revalidatePath(`/${orgSlug}/manage/members`);
    revalidatePath(`/${orgSlug}/manage/members/roles`);

    return {
      ok: true
    };
  } catch (error) {
    rethrowIfNavigationError(error);
    return asFailure("action_failed", "Unable to create this role right now.");
  }
}

export async function removeMembershipAction(input: {
  orgSlug: string;
  membershipId: string;
}): Promise<ManageAccessResult> {
  const parsedInput = removeMembershipSchema.safeParse(input);

  if (!parsedInput.success) {
    return asFailure("invalid_input", "Invalid membership request.");
  }

  try {
    const { orgSlug, membershipId } = parsedInput.data;
    const orgContext = await requireManageAccessContext(orgSlug);
    const supabase = getConfiguredServiceClient();

    if (!supabase) {
      return asFailure("service_not_configured", "Membership removals require SUPABASE_SERVICE_ROLE_KEY on the server.");
    }

    const membership = await findMembershipById(supabase, orgContext.orgId, membershipId);

    if (!membership) {
      return asFailure("not_found", "Membership not found.");
    }

    const actorIsAdmin = orgContext.membershipRole === "admin";
    const targetIsAdmin = membership.role === "admin";

    if (targetIsAdmin && !actorIsAdmin) {
      return asFailure("forbidden", "Only organization admins can remove admin memberships.");
    }

    if (targetIsAdmin) {
      const adminCount = await countAdmins(supabase, orgContext.orgId);

      if (adminCount <= 1) {
        return asFailure("last_admin", "This organization must keep at least one admin.");
      }
    }

    const { error: deleteError } = await supabase
      .from("org_memberships")
      .delete()
      .eq("org_id", orgContext.orgId)
      .eq("id", membershipId);

    if (deleteError) {
      return asFailure("action_failed", deleteError.message);
    }

    revalidatePath(`/${orgSlug}/manage/members`);

    return { ok: true };
  } catch (error) {
    rethrowIfNavigationError(error);
    return asFailure("action_failed", "Unable to remove this membership right now.");
  }
}

export async function sendPasswordResetAction(input: {
  orgSlug: string;
  email: string;
  redirectTo?: string;
}): Promise<ManageAccessResult> {
  const parsedInput = sendPasswordResetSchema.safeParse(input);

  if (!parsedInput.success) {
    return asFailure("invalid_input", "Please provide a valid email address.");
  }

  try {
    const { orgSlug, email, redirectTo } = parsedInput.data;
    const orgContext = await requireManageAccessContext(orgSlug);
    const supabase = getConfiguredServiceClient();

    if (!supabase) {
      return asFailure("service_not_configured", "Password reset emails require SUPABASE_SERVICE_ROLE_KEY on the server.");
    }

    const user = await findAuthUserByEmail(supabase, email);

    if (!user) {
      return asFailure("not_found", "No account was found for that email.");
    }

    const inOrg = await membershipExists(supabase, orgContext.orgId, user.id);

    if (!inOrg) {
      return asFailure("forbidden", "This user does not belong to this organization.");
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);

    if (error) {
      return asFailure("action_failed", error.message);
    }

    return { ok: true };
  } catch (error) {
    rethrowIfNavigationError(error);
    return asFailure("action_failed", "Unable to send a password reset email right now.");
  }
}
