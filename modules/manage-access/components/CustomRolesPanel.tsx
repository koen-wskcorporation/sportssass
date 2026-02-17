"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { can } from "@/lib/permissions/can";
import { permissionDefinitions, type OrgRole, type Permission } from "@/modules/core/tools/access";
import { createCustomRoleAction, type AccessRoleDefinition } from "@/modules/manage-access/actions";

type PermissionDefinition = (typeof permissionDefinitions)[number];

type CustomRolesPanelProps = {
  orgSlug: string;
  currentUserRole: OrgRole;
  currentUserPermissions: Permission[];
  roles: AccessRoleDefinition[];
  loadError: string | null;
  serviceRoleConfigured: boolean;
};

const permissionLabelByKey = new Map(permissionDefinitions.map((definition) => [definition.permission, definition.label]));

export function CustomRolesPanel({
  orgSlug,
  currentUserRole,
  currentUserPermissions,
  roles,
  loadError,
  serviceRoleConfigured
}: CustomRolesPanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [customRoleLabel, setCustomRoleLabel] = useState("");
  const [customRolePermissions, setCustomRolePermissions] = useState<Permission[]>([]);
  const [isCreatingCustomRole, startCreateCustomRoleTransition] = useTransition();

  const customRoles = useMemo(() => roles.filter((role) => role.source === "custom"), [roles]);
  const canManageActions = serviceRoleConfigured && !loadError && can(currentUserPermissions, "org.manage.read");
  const canCreateCustomRoles = canManageActions && currentUserRole === "admin";

  const permissionGroups = useMemo(() => {
    const grouped = permissionDefinitions.reduce<Record<string, PermissionDefinition[]>>((draft, definition) => {
      draft[definition.group] = [...(draft[definition.group] ?? []), definition];
      return draft;
    }, {});

    return Object.entries(grouped).map(([group, definitions]) => ({
      group,
      definitions
    }));
  }, []);

  function toggleCustomRolePermission(permission: Permission, nextChecked: boolean) {
    setCustomRolePermissions((current) => {
      const withChange = nextChecked ? [...current, permission] : current.filter((item) => item !== permission);
      const deduped = new Set(withChange);
      return permissionDefinitions
        .map((definition) => definition.permission)
        .filter((definitionPermission) => deduped.has(definitionPermission));
    });
  }

  function handleCreateCustomRoleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canCreateCustomRoles) {
      return;
    }

    startCreateCustomRoleTransition(async () => {
      const result = await createCustomRoleAction({
        orgSlug,
        label: customRoleLabel,
        permissions: customRolePermissions
      });

      if (!result.ok) {
        toast({
          title: "Role creation failed",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Custom role created",
        variant: "success"
      });
      setCustomRoleLabel("");
      setCustomRolePermissions([]);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {loadError ? <Alert variant="warning">{loadError}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>Create custom role</CardTitle>
          <CardDescription>Create purpose-built roles by selecting permissions. These roles can be used for invites and member updates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!canCreateCustomRoles ? <Alert variant="warning">Only organization admins can create custom roles.</Alert> : null}

          <form className="space-y-4" onSubmit={handleCreateCustomRoleSubmit}>
            <FormField hint="Example: Content editor" label="Role name">
              <Input
                disabled={!canCreateCustomRoles || isCreatingCustomRole}
                onChange={(event) => setCustomRoleLabel(event.target.value)}
                placeholder="Content editor"
                value={customRoleLabel}
              />
            </FormField>

            <div className="space-y-3">
              <p className="text-[13px] font-semibold text-text">Permissions</p>
              {permissionGroups.map((group) => (
                <div className="space-y-2" key={group.group}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{group.group}</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {group.definitions.map((definition) => {
                      const checked = customRolePermissions.includes(definition.permission);

                      return (
                        <label
                          className="flex items-start justify-between gap-3 rounded-control border bg-surface px-3 py-2 text-sm"
                          key={definition.permission}
                        >
                          <span className="space-y-0.5">
                            <span className="block font-medium text-text">{definition.label}</span>
                            <span className="block text-xs text-text-muted">{definition.description}</span>
                          </span>
                          <input
                            checked={checked}
                            disabled={!canCreateCustomRoles || isCreatingCustomRole}
                            onChange={(event) => toggleCustomRolePermission(definition.permission, event.target.checked)}
                            type="checkbox"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <Button
              disabled={!canCreateCustomRoles || isCreatingCustomRole || !customRoleLabel.trim() || customRolePermissions.length === 0}
              type="submit"
            >
              {isCreatingCustomRole ? "Creating..." : "Create custom role"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current custom roles</CardTitle>
          <CardDescription>Roles listed here are available to assign in the Members subpage.</CardDescription>
        </CardHeader>
        <CardContent>
          {customRoles.length === 0 ? (
            <p className="text-sm text-text-muted">No custom roles created yet.</p>
          ) : (
            <div className="space-y-2">
              {customRoles.map((role) => (
                <div className="space-y-2 rounded-control border bg-surface-muted px-3 py-3" key={role.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="warning">{role.label}</Badge>
                    <span className="font-mono text-xs text-text-muted">{role.roleKey}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.map((permission) => (
                      <Badge key={`${role.id}:${permission}`} variant="neutral">
                        {permissionLabelByKey.get(permission) ?? permission}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
