"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { can } from "@/lib/permissions/can";
import { getRoleLabel, isAdminLikeRole, type OrgRole, type Permission } from "@/modules/core/access";
import {
  inviteUserToOrgAction,
  removeMembershipAction,
  sendPasswordResetAction,
  updateMembershipRoleAction,
  type AccessMember,
  type AccessRoleDefinition
} from "@/modules/manage-access/actions";

type TableColumnKey = "role" | "status" | "joined" | "lastActivity" | "userId";

type AccountsAccessPanelProps = {
  orgSlug: string;
  currentUserRole: OrgRole;
  currentUserPermissions: Permission[];
  members: AccessMember[];
  roles: AccessRoleDefinition[];
  loadError: string | null;
  serviceRoleConfigured: boolean;
};

const orderedColumnKeys: TableColumnKey[] = ["role", "status", "joined", "lastActivity", "userId"];
const defaultVisibleColumns: TableColumnKey[] = ["role", "status", "joined", "lastActivity"];
const columnLabels: Record<TableColumnKey, string> = {
  role: "Role",
  status: "Status",
  joined: "Joined",
  lastActivity: "Last activity",
  userId: "User ID"
};

function normalizeVisibleColumns(rawValue: unknown): TableColumnKey[] {
  if (!Array.isArray(rawValue)) {
    return defaultVisibleColumns;
  }

  const normalized = orderedColumnKeys.filter((key) => rawValue.includes(key));
  return normalized.length > 0 ? normalized : defaultVisibleColumns;
}

function roleBadgeVariant(role: OrgRole) {
  if (isAdminLikeRole(role)) {
    return "success";
  }

  return "neutral";
}

function statusBadgeVariant(status: AccessMember["status"]) {
  return status === "active" ? "success" : "warning";
}

function statusLabel(status: AccessMember["status"]) {
  return status === "active" ? "active" : "pending";
}

function canEditAdminMembership(currentUserRole: OrgRole, memberRole: OrgRole) {
  return isAdminLikeRole(currentUserRole) || !isAdminLikeRole(memberRole);
}

function toAssignableRole(role: OrgRole): OrgRole {
  return isAdminLikeRole(role) ? "admin" : "member";
}

function formatDateTime(value: string | null, formatter: Intl.DateTimeFormat) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return formatter.format(date);
}

function getDefaultInviteRole(options: SelectOption[]) {
  if (options.some((option) => option.value === "member")) {
    return "member";
  }

  return options[0]?.value ?? "member";
}

export function AccountsAccessPanel({
  orgSlug,
  currentUserRole,
  currentUserPermissions,
  members,
  roles,
  loadError,
  serviceRoleConfigured
}: AccountsAccessPanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("member");
  const [roleDraftByMembershipId, setRoleDraftByMembershipId] = useState<Record<string, OrgRole>>({});
  const [removeTarget, setRemoveTarget] = useState<AccessMember | null>(null);
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null);
  const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<TableColumnKey[]>(defaultVisibleColumns);
  const [isInviting, startInviteTransition] = useTransition();
  const [isRemoving, startRemoveTransition] = useTransition();
  const [activeRoleSaveId, setActiveRoleSaveId] = useState<string | null>(null);
  const [activeResetMembershipId, setActiveResetMembershipId] = useState<string | null>(null);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
      }),
    []
  );

  const roleByKey = useMemo(() => {
    return new Map(roles.map((role) => [role.roleKey, role]));
  }, [roles]);

  const assignableRoleOptions = useMemo<SelectOption[]>(
    () =>
      roles.map((role) => ({
        value: role.roleKey,
        label: role.label
      })),
    [roles]
  );

  const nonAdminRoleOptions = useMemo(
    () => assignableRoleOptions.filter((option) => option.value !== "admin"),
    [assignableRoleOptions]
  );

  const canManageActions = serviceRoleConfigured && !loadError && can(currentUserPermissions, "org.manage.read");

  const sortedMembers = useMemo(() => {
    return [...members].sort((left, right) => {
      const leftValue = (left.email ?? left.userId).toLowerCase();
      const rightValue = (right.email ?? right.userId).toLowerCase();
      return leftValue.localeCompare(rightValue);
    });
  }, [members]);

  const selectedMember = useMemo(() => {
    if (!selectedMembershipId) {
      return null;
    }

    return sortedMembers.find((member) => member.membershipId === selectedMembershipId) ?? null;
  }, [selectedMembershipId, sortedMembers]);

  useEffect(() => {
    if (assignableRoleOptions.length === 0) {
      return;
    }

    const inviteRoleStillValid = assignableRoleOptions.some((option) => option.value === inviteRole);

    if (!inviteRoleStillValid) {
      setInviteRole(getDefaultInviteRole(assignableRoleOptions));
    }
  }, [assignableRoleOptions, inviteRole]);

  useEffect(() => {
    setRoleDraftByMembershipId(
      members.reduce<Record<string, OrgRole>>((drafts, member) => {
        drafts[member.membershipId] = toAssignableRole(member.role);
        return drafts;
      }, {})
    );
  }, [members]);

  useEffect(() => {
    const storageKey = `accounts-access-columns:${orgSlug}`;

    try {
      const rawColumns = window.localStorage.getItem(storageKey);
      if (!rawColumns) {
        return;
      }

      const parsedColumns = JSON.parse(rawColumns) as unknown;
      setVisibleColumns(normalizeVisibleColumns(parsedColumns));
    } catch {
      setVisibleColumns(defaultVisibleColumns);
    }
  }, [orgSlug]);

  useEffect(() => {
    const storageKey = `accounts-access-columns:${orgSlug}`;

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(visibleColumns));
    } catch {
      // Ignore localStorage failures.
    }
  }, [orgSlug, visibleColumns]);

  useEffect(() => {
    if (!selectedMembershipId) {
      return;
    }

    const stillExists = members.some((member) => member.membershipId === selectedMembershipId);

    if (!stillExists) {
      setSelectedMembershipId(null);
    }
  }, [members, selectedMembershipId]);

  function resolveRoleLabel(roleKey: OrgRole) {
    return roleByKey.get(roleKey)?.label ?? getRoleLabel(roleKey);
  }

  function getRoleOptions(member: AccessMember) {
    if (isAdminLikeRole(currentUserRole)) {
      return assignableRoleOptions;
    }

    if (isAdminLikeRole(member.role)) {
      return [{ value: "admin", label: resolveRoleLabel("admin") }];
    }

    return nonAdminRoleOptions;
  }

  function displayUser(member: AccessMember) {
    if (member.email) {
      return member.email;
    }

    return member.userId;
  }

  function handleInviteSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManageActions) {
      return;
    }

    startInviteTransition(async () => {
      const result = await inviteUserToOrgAction({
        orgSlug,
        email: inviteEmail,
        role: inviteRole
      });

      if (!result.ok) {
        toast({
          title: "Invite failed",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Invite sent",
        variant: "success"
      });
      setInviteEmail("");
      setInviteRole(getDefaultInviteRole(assignableRoleOptions));
      router.refresh();
    });
  }

  function handleRoleSave(member: AccessMember) {
    if (!canManageActions) {
      return;
    }

    const currentRole = toAssignableRole(member.role);
    const nextRole = roleDraftByMembershipId[member.membershipId] ?? currentRole;

    if (nextRole === currentRole) {
      toast({
        title: "No changes to save",
        variant: "info"
      });
      return;
    }

    setActiveRoleSaveId(member.membershipId);

    void (async () => {
      const result = await updateMembershipRoleAction({
        orgSlug,
        membershipId: member.membershipId,
        role: nextRole
      });

      setActiveRoleSaveId(null);

      if (!result.ok) {
        toast({
          title: "Role update failed",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Role updated",
        variant: "success"
      });
      router.refresh();
    })();
  }

  function handleSendReset(member: AccessMember) {
    if (!canManageActions || !member.email) {
      return;
    }

    setActiveResetMembershipId(member.membershipId);

    const redirectTo = `${window.location.origin}/auth/login`;

    void (async () => {
      const result = await sendPasswordResetAction({
        orgSlug,
        email: member.email ?? "",
        redirectTo
      });

      setActiveResetMembershipId(null);

      if (!result.ok) {
        toast({
          title: "Password reset failed",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Password reset sent",
        variant: "success"
      });
    })();
  }

  function handleRemoveConfirm() {
    if (!canManageActions || !removeTarget) {
      return;
    }

    startRemoveTransition(async () => {
      const result = await removeMembershipAction({
        orgSlug,
        membershipId: removeTarget.membershipId
      });

      if (!result.ok) {
        toast({
          title: "Remove access failed",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      setRemoveTarget(null);
      setSelectedMembershipId(null);
      toast({
        title: "Access removed",
        variant: "success"
      });
      router.refresh();
    });
  }

  function toggleVisibleColumn(columnKey: TableColumnKey, nextChecked: boolean) {
    setVisibleColumns((current) => {
      const withChange = nextChecked ? [...current, columnKey] : current.filter((item) => item !== columnKey);
      const ordered = orderedColumnKeys.filter((key) => withChange.includes(key));
      return ordered.length > 0 ? ordered : ["role"];
    });
  }

  function isColumnVisible(columnKey: TableColumnKey) {
    return visibleColumns.includes(columnKey);
  }

  const emptyStateColSpan = 1 + visibleColumns.length;
  const selectedRoleOptions = selectedMember ? getRoleOptions(selectedMember) : [];
  const selectedRoleDraft = selectedMember ? (roleDraftByMembershipId[selectedMember.membershipId] ?? toAssignableRole(selectedMember.role)) : "";
  const selectedRoleValue = selectedRoleOptions.some((option) => option.value === selectedRoleDraft)
    ? selectedRoleDraft
    : (selectedRoleOptions[0]?.value ?? selectedRoleDraft);

  return (
    <div className="space-y-6">
      {loadError ? <Alert variant="warning">{loadError}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>Invite user</CardTitle>
          <CardDescription>Add a user by email and assign their initial organization role.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[2fr_1fr_auto]" onSubmit={handleInviteSubmit}>
            <FormField className="md:col-span-1" label="Email">
              <Input
                autoComplete="email"
                disabled={!canManageActions || isInviting}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="name@example.com"
                required
                type="email"
                value={inviteEmail}
              />
            </FormField>

            <FormField className="md:col-span-1" label="Role">
              <Select
                disabled={!canManageActions || isInviting || assignableRoleOptions.length === 0}
                onChange={(event) => {
                  setInviteRole(event.target.value as OrgRole);
                }}
                options={assignableRoleOptions}
                value={inviteRole}
              />
            </FormField>

            <div className="md:pt-[26px]">
              <Button disabled={!canManageActions || isInviting || assignableRoleOptions.length === 0} loading={isInviting} type="submit">
                {isInviting ? "Sending..." : "Send Invite"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Members</CardTitle>
            <CardDescription>Click any row to open a member profile and manage access actions.</CardDescription>
          </div>
          <Button onClick={() => setIsColumnDialogOpen(true)} size="sm" variant="secondary">
            Customize table
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                {isColumnVisible("role") ? <TableHead>Role</TableHead> : null}
                {isColumnVisible("status") ? <TableHead>Status</TableHead> : null}
                {isColumnVisible("joined") ? <TableHead>Joined</TableHead> : null}
                {isColumnVisible("lastActivity") ? <TableHead>Last activity</TableHead> : null}
                {isColumnVisible("userId") ? <TableHead>User ID</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMembers.length === 0 ? (
                <TableRow>
                  <TableCell className="py-8 text-center text-text-muted" colSpan={emptyStateColSpan}>
                    No org members found.
                  </TableCell>
                </TableRow>
              ) : (
                sortedMembers.map((member) => (
                  <TableRow
                    aria-label={`Open profile for ${displayUser(member)}`}
                    className="cursor-pointer"
                    key={member.membershipId}
                    onClick={() => setSelectedMembershipId(member.membershipId)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedMembershipId(member.membershipId);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">
                          {displayUser(member)} {member.isCurrentUser ? "(you)" : ""}
                        </p>
                      </div>
                    </TableCell>
                    {isColumnVisible("role") ? (
                      <TableCell>
                        <Badge variant={roleBadgeVariant(member.role)}>{resolveRoleLabel(member.role)}</Badge>
                      </TableCell>
                    ) : null}
                    {isColumnVisible("status") ? (
                      <TableCell>
                        <Badge variant={statusBadgeVariant(member.status)}>{statusLabel(member.status)}</Badge>
                      </TableCell>
                    ) : null}
                    {isColumnVisible("joined") ? <TableCell>{formatDateTime(member.joinedAt, dateFormatter)}</TableCell> : null}
                    {isColumnVisible("lastActivity") ? <TableCell>{formatDateTime(member.lastActivityAt, dateFormatter)}</TableCell> : null}
                    {isColumnVisible("userId") ? <TableCell className="font-mono text-xs">{member.userId}</TableCell> : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog onClose={() => setIsColumnDialogOpen(false)} open={isColumnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customize table</DialogTitle>
            <DialogDescription>Select which member columns are visible.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {orderedColumnKeys.map((columnKey) => {
              const checked = isColumnVisible(columnKey);

              return (
                <label className="flex items-center justify-between gap-3 rounded-control border bg-surface px-3 py-2 text-sm" key={columnKey}>
                  <span>{columnLabels[columnKey]}</span>
                  <input
                    checked={checked}
                    onChange={(event) => toggleVisibleColumn(columnKey, event.target.checked)}
                    type="checkbox"
                  />
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setVisibleColumns(defaultVisibleColumns);
              }}
              variant="ghost"
            >
              Reset default
            </Button>
            <Button onClick={() => setIsColumnDialogOpen(false)} variant="secondary">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onClose={() => {
          if (!isRemoving) {
            setSelectedMembershipId(null);
          }
        }}
        open={Boolean(selectedMember)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedMember ? displayUser(selectedMember) : "Member profile"}</DialogTitle>
            <DialogDescription>Manage role, account recovery, and access for this user.</DialogDescription>
          </DialogHeader>

          {selectedMember ? (
            <div className="space-y-4">
              <Card className="shadow-none">
                <CardContent className="grid gap-3 py-6 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Status</p>
                    <Badge className="mt-1" variant={statusBadgeVariant(selectedMember.status)}>
                      {statusLabel(selectedMember.status)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Role</p>
                    <Badge className="mt-1" variant={roleBadgeVariant(selectedMember.role)}>
                      {resolveRoleLabel(selectedMember.role)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Joined</p>
                    <p className="mt-1 text-sm text-text">{formatDateTime(selectedMember.joinedAt, dateFormatter)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Last activity</p>
                    <p className="mt-1 text-sm text-text">{formatDateTime(selectedMember.lastActivityAt, dateFormatter)}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">User ID</p>
                    <p className="mt-1 break-all font-mono text-xs text-text-muted">{selectedMember.userId}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                <FormField label="Change role">
                  <Select
                    disabled={!canManageActions || !canEditAdminMembership(currentUserRole, selectedMember.role) || activeRoleSaveId === selectedMember.membershipId}
                    onChange={(event) => {
                      setRoleDraftByMembershipId((current) => ({
                        ...current,
                        [selectedMember.membershipId]: event.target.value as OrgRole
                      }));
                    }}
                    options={selectedRoleOptions}
                    value={selectedRoleValue}
                  />
                </FormField>
                <Button
                  className="md:mb-px"
                  disabled={!canManageActions || !canEditAdminMembership(currentUserRole, selectedMember.role) || activeRoleSaveId === selectedMember.membershipId}
                  loading={activeRoleSaveId === selectedMember.membershipId}
                  onClick={() => handleRoleSave(selectedMember)}
                  variant="secondary"
                >
                  {activeRoleSaveId === selectedMember.membershipId ? "Saving..." : "Save role"}
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 border-t pt-4">
                <Button
                  disabled={!canManageActions || !selectedMember.email || activeResetMembershipId === selectedMember.membershipId}
                  loading={activeResetMembershipId === selectedMember.membershipId}
                  onClick={() => handleSendReset(selectedMember)}
                  variant="ghost"
                >
                  {activeResetMembershipId === selectedMember.membershipId ? "Sending..." : "Send password reset"}
                </Button>
                <Button
                  disabled={!canManageActions || !canEditAdminMembership(currentUserRole, selectedMember.role) || isRemoving}
                  onClick={() => setRemoveTarget(selectedMember)}
                  variant="destructive"
                >
                  Remove access
                </Button>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button onClick={() => setSelectedMembershipId(null)} variant="secondary">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onClose={() => {
          if (!isRemoving) {
            setRemoveTarget(null);
          }
        }}
        open={Boolean(removeTarget)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove access</DialogTitle>
            <DialogDescription>
              {removeTarget ? `Remove ${displayUser(removeTarget)} from this organization?` : "Remove this membership?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button disabled={isRemoving} onClick={() => setRemoveTarget(null)} variant="ghost">
              Cancel
            </Button>
            <Button disabled={isRemoving} loading={isRemoving} onClick={handleRemoveConfirm} variant="destructive">
              {isRemoving ? "Removing..." : "Confirm remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
