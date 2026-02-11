import { hasPermissions, type OrgRole, type Permission } from "@/modules/core/tools/access";

export type ToolStatus = "active" | "beta" | "hidden";

export type ToolDefinition = {
  toolId: string;
  name: string;
  description: string;
  navGroup: "Operations" | "Finance" | "Compliance" | "Revenue";
  routes: {
    appBase: string;
    publicBase?: string;
  };
  permissions: Permission[];
  status: ToolStatus;
};

export const toolRegistry: ToolDefinition[] = [
  {
    toolId: "sponsors",
    name: "Sponsorships",
    description: "Review and manage sponsorship pipeline activity.",
    navGroup: "Revenue",
    routes: {
      appBase: "/app/sponsors/manage?org=[orgSlug]",
      publicBase: "/app/sponsors/form?org=[orgSlug]"
    },
    permissions: ["sponsors.read"],
    status: "active"
  }
];

export function resolveToolRoute(routeTemplate: string, orgSlug: string) {
  return routeTemplate.replace("[orgSlug]", orgSlug);
}

export function getToolsForRole(role: OrgRole) {
  return toolRegistry.filter((tool) => tool.status !== "hidden" && hasPermissions(role, tool.permissions));
}
