import { hasPermissions, type Permission } from "@/modules/core/tools/access";

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
    toolId: "forms",
    name: "Forms",
    description: "Build, publish, and embed dynamic forms with submission workflows.",
    navGroup: "Operations",
    routes: {
      appBase: "/[orgSlug]/tools/forms"
    },
    permissions: ["forms.read"],
    status: "active"
  },
  {
    toolId: "sponsors",
    name: "Sponsorships",
    description: "Review and manage sponsorship pipeline activity.",
    navGroup: "Revenue",
    routes: {
      appBase: "/[orgSlug]/tools/sponsors",
      publicBase: "/[orgSlug]/sponsors"
    },
    permissions: ["sponsors.read"],
    status: "active"
  },
  {
    toolId: "announcements",
    name: "Announcements",
    description: "Create, schedule, and publish organization announcements.",
    navGroup: "Operations",
    routes: {
      appBase: "/[orgSlug]/tools/announcements"
    },
    permissions: ["announcements.read"],
    status: "active"
  }
];

export function resolveToolRoute(routeTemplate: string, orgSlug: string) {
  return routeTemplate.replace("[orgSlug]", orgSlug);
}

export function getToolsForPermissions(grantedPermissions: Permission[]) {
  return toolRegistry.filter((tool) => tool.status !== "hidden" && hasPermissions(grantedPermissions, tool.permissions));
}
