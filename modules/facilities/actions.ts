"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { rethrowIfNavigationError } from "@/lib/actions/rethrowIfNavigationError";
import { getOrgAuthContext } from "@/lib/org/getOrgAuthContext";
import { can } from "@/lib/permissions/can";
import { requireOrgPermission } from "@/lib/permissions/requireOrgPermission";
import {
  createFacilityNodeRecord,
  createFacilityRecord,
  deleteFacilityNodeRecord,
  deleteFacilityRecord,
  getFacilityBookingMapSnapshotForOccurrence,
  getFacilityById,
  getFacilityNodeById,
  listFacilityMapReadModel,
  listFacilityNodes,
  updateFacilityMetadataRecord,
  updateFacilityNodeRecord,
  updateFacilityRecord
} from "@/modules/facilities/db/queries";
import type { Facility, FacilityMapDraft, FacilityMapDraftNode, FacilityMapReadModel, FacilityNode, FacilityNodeKind } from "@/modules/facilities/types";
import { normalizeFacilityNodeLayout, toSlug } from "@/modules/facilities/utils";

type FacilitiesActionResult<TData = undefined> =
  | {
      ok: true;
      data: TData;
    }
  | {
      ok: false;
      error: string;
    };

function asError(error: string): FacilitiesActionResult<never> {
  return {
    ok: false,
    error
  };
}

const textSchema = z.string().trim();

const facilitySchema = z.object({
  orgSlug: textSchema.min(1),
  facilityId: z.string().uuid().optional(),
  name: textSchema.min(2).max(120),
  slug: textSchema.max(120).optional(),
  facilityType: z.enum(["park", "complex", "building", "campus", "field_cluster", "gym", "indoor", "custom"]),
  status: z.enum(["open", "closed", "archived"]).optional(),
  timezone: textSchema.max(120).optional(),
  sortIndex: z.number().int().min(0).optional(),
  metadataJson: z.record(z.string(), z.unknown()).optional()
});

const deleteFacilitySchema = z.object({
  orgSlug: textSchema.min(1),
  facilityId: z.string().uuid()
});

const facilityNodeSchema = z.object({
  orgSlug: textSchema.min(1),
  nodeId: z.string().uuid().optional(),
  facilityId: z.string().uuid(),
  parentNodeId: z.string().uuid().nullable().optional(),
  name: textSchema.min(2).max(120),
  slug: textSchema.max(120).optional(),
  nodeKind: z.enum([
    "facility",
    "zone",
    "building",
    "section",
    "field",
    "court",
    "diamond",
    "rink",
    "room",
    "amenity",
    "parking",
    "support_area",
    "custom"
  ]),
  status: z.enum(["open", "closed", "archived"]).optional(),
  isBookable: z.boolean().optional(),
  capacity: z.number().int().min(0).nullable().optional(),
  layout: z
    .object({
      x: z.number().int().optional(),
      y: z.number().int().optional(),
      w: z.number().int().optional(),
      h: z.number().int().optional(),
      z: z.number().int().optional(),
      shape: z.enum(["rect", "pill"]).optional(),
      containerMode: z.enum(["free", "stack"]).optional()
    })
    .optional(),
  sortIndex: z.number().int().min(0).optional(),
  metadataJson: z.record(z.string(), z.unknown()).optional()
});

const deleteFacilityNodeSchema = z.object({
  orgSlug: textSchema.min(1),
  nodeId: z.string().uuid()
});

const bookingSnapshotSchema = z.object({
  orgSlug: textSchema.min(1),
  occurrenceId: z.string().uuid()
});

const facilityMapDraftNodeSchema = z.object({
  id: textSchema.min(1).max(120),
  publishedNodeId: z.string().uuid().nullable(),
  parentId: z.string().min(1).max(120).nullable(),
  name: textSchema.min(1).max(120),
  nodeKind: z.enum([
    "facility",
    "zone",
    "building",
    "section",
    "field",
    "court",
    "diamond",
    "rink",
    "room",
    "amenity",
    "parking",
    "support_area",
    "custom"
  ]),
  status: z.enum(["open", "closed", "archived"]),
  isBookable: z.boolean(),
  capacity: z.number().int().min(0).nullable(),
  layout: z.object({
    x: z.number().int(),
    y: z.number().int(),
    w: z.number().int(),
    h: z.number().int(),
    z: z.number().int(),
    shape: z.enum(["rect", "pill"]),
    containerMode: z.enum(["free", "stack"])
  }),
  metadataJson: z.record(z.string(), z.unknown()),
  sortIndex: z.number().int().min(0)
});

const saveFacilityMapDraftSchema = z.object({
  orgSlug: textSchema.min(1),
  facilityId: z.string().uuid(),
  nodes: z.array(facilityMapDraftNodeSchema).max(1000)
});

const publishFacilityMapDraftSchema = z.object({
  orgSlug: textSchema.min(1),
  facilityId: z.string().uuid()
});

function resolveTimezone(value: string | null | undefined) {
  const fallback = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const candidate = value?.trim();

  if (!candidate) {
    return fallback;
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return fallback;
  }
}

function revalidateFacilitiesRoutes(orgSlug: string, facilityId?: string) {
  revalidatePath(`/${orgSlug}/workspace/facilities`);
  if (facilityId) {
    revalidatePath(`/${orgSlug}/workspace/facilities/${facilityId}`);
    revalidatePath(`/${orgSlug}/workspace/facilities/${facilityId}/edit`);
  }
  revalidatePath(`/${orgSlug}/workspace/events`);
  revalidatePath(`/${orgSlug}`);
}

function hasNodeParentCycle(nodes: FacilityNode[], nodeId: string, parentNodeId: string | null) {
  const parentById = new Map(nodes.map((node) => [node.id, node.parentNodeId]));
  parentById.set(nodeId, parentNodeId);
  const seen = new Set<string>([nodeId]);
  let cursor = parentNodeId;
  while (cursor) {
    if (seen.has(cursor)) {
      return true;
    }
    seen.add(cursor);
    cursor = parentById.get(cursor) ?? null;
  }
  return false;
}

function hasAreaAncestor(nodes: FacilityNode[], startNodeId: string | null) {
  if (!startNodeId) {
    return false;
  }

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  let cursor: string | null = startNodeId;

  while (cursor) {
    if (visited.has(cursor)) {
      return false;
    }
    visited.add(cursor);
    const node = byId.get(cursor);
    if (!node) {
      return false;
    }
    if (node.nodeKind === "zone") {
      return true;
    }
    cursor = node.parentNodeId;
  }

  return false;
}

function validateAreaContainment(nodes: FacilityNode[]) {
  const areaCount = nodes.filter((node) => node.nodeKind === "zone").length;
  if (areaCount < 1) {
    return "Each facility map must include at least one area.";
  }

  for (const node of nodes) {
    if (node.nodeKind === "zone" && node.parentNodeId) {
      return "Areas must be top-level and cannot have a parent.";
    }

    if (node.nodeKind !== "zone") {
      if (!node.parentNodeId) {
        return "All non-area nodes must be contained within an area.";
      }

      if (!hasAreaAncestor(nodes, node.parentNodeId)) {
        return "All non-area nodes must be contained within an area.";
      }
    }
  }

  return null;
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function parseFacilityMapDraft(metadataJson: Record<string, unknown>): FacilityMapDraft | null {
  const raw = metadataJson.mapDraft;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const version = record.version;
  if (version !== 1) {
    return null;
  }

  const updatedAtUtc = typeof record.updatedAtUtc === "string" ? record.updatedAtUtc : new Date().toISOString();
  const nodesRaw = Array.isArray(record.nodes) ? record.nodes : [];
  const parsedNodes = z.array(facilityMapDraftNodeSchema).safeParse(nodesRaw);
  if (!parsedNodes.success) {
    return null;
  }

  return {
    version: 1,
    updatedAtUtc,
    nodes: parsedNodes.data
  };
}

function hasDraftAreaAncestor(nodesById: Map<string, FacilityMapDraftNode>, startNodeId: string | null) {
  if (!startNodeId) {
    return false;
  }

  const visited = new Set<string>();
  let cursor: string | null = startNodeId;

  while (cursor) {
    if (visited.has(cursor)) {
      return false;
    }
    visited.add(cursor);
    const node = nodesById.get(cursor);
    if (!node) {
      return false;
    }
    if (node.nodeKind === "zone") {
      return true;
    }
    cursor = node.parentId;
  }

  return false;
}

function validateDraftNodes(nodes: FacilityMapDraftNode[]) {
  const areaCount = nodes.filter((node) => node.nodeKind === "zone").length;
  if (areaCount < 1) {
    return "Each facility map must include at least one area.";
  }

  const nodesById = new Map<string, FacilityMapDraftNode>();
  for (const node of nodes) {
    if (nodesById.has(node.id)) {
      return "Draft contains duplicate nodes.";
    }
    nodesById.set(node.id, node);
  }

  for (const node of nodes) {
    if (node.parentId && !nodesById.has(node.parentId)) {
      return "Draft contains invalid parent references.";
    }
    if (node.parentId && node.parentId === node.id) {
      return "Draft contains invalid parent relationships.";
    }
    if (node.nodeKind === "zone" && node.parentId) {
      return "Areas must be top-level and cannot have a parent.";
    }
    if (node.nodeKind !== "zone") {
      if (!node.parentId) {
        return "All non-area nodes must be contained within an area.";
      }
      if (!hasDraftAreaAncestor(nodesById, node.parentId)) {
        return "All non-area nodes must be contained within an area.";
      }
    }
  }

  const pending = new Set(nodes.map((node) => node.id));
  while (pending.size > 0) {
    let progressed = false;
    for (const nodeId of Array.from(pending)) {
      const node = nodesById.get(nodeId);
      if (!node) {
        return "Draft contains invalid nodes.";
      }
      if (!node.parentId || !pending.has(node.parentId)) {
        pending.delete(nodeId);
        progressed = true;
      }
    }
    if (!progressed) {
      return "Draft contains a parent cycle.";
    }
  }

  return null;
}

function buildTopologicalDraftOrder(nodes: FacilityMapDraftNode[]) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const pending = new Set(nodes.map((node) => node.id));
  const ordered: string[] = [];

  while (pending.size > 0) {
    let progressed = false;
    for (const nodeId of Array.from(pending)) {
      const node = byId.get(nodeId);
      if (!node) {
        throw new Error("Draft node missing.");
      }
      if (!node.parentId || !pending.has(node.parentId)) {
        ordered.push(nodeId);
        pending.delete(nodeId);
        progressed = true;
      }
    }
    if (!progressed) {
      throw new Error("Draft cycle detected.");
    }
  }

  return ordered;
}

export async function getFacilitiesWorkspaceDataAction(input: {
  orgSlug: string;
}): Promise<FacilitiesActionResult<{ readModel: FacilityMapReadModel }>> {
  try {
    const org = await requireOrgPermission(input.orgSlug, "spaces.read");
    const readModel = await listFacilityMapReadModel(org.orgId);
    return {
      ok: true,
      data: {
        readModel
      }
    };
  } catch (error) {
    rethrowIfNavigationError(error);
    return asError("Unable to load facilities workspace data.");
  }
}

export async function upsertFacilityAction(
  input: z.input<typeof facilitySchema>
): Promise<FacilitiesActionResult<{ facilityId: string; readModel: FacilityMapReadModel }>> {
  const parsed = facilitySchema.safeParse(input);
  if (!parsed.success) {
    return asError("Please review the facility details.");
  }

  try {
    const payload = parsed.data;
    const org = await requireOrgPermission(payload.orgSlug, "spaces.write");

    const saved = payload.facilityId
      ? await updateFacilityRecord({
          orgId: org.orgId,
          facilityId: payload.facilityId,
          name: payload.name,
          slug: toSlug(payload.slug ?? payload.name),
          facilityType: payload.facilityType,
          status: payload.status ?? "open",
          timezone: resolveTimezone(payload.timezone),
          metadataJson: payload.metadataJson ?? {},
          sortIndex: payload.sortIndex ?? 0
        })
      : await createFacilityRecord({
          orgId: org.orgId,
          name: payload.name,
          slug: toSlug(payload.slug ?? payload.name),
          facilityType: payload.facilityType,
          status: payload.status ?? "open",
          timezone: resolveTimezone(payload.timezone),
          metadataJson: payload.metadataJson ?? {},
          sortIndex: payload.sortIndex ?? 0
        });

    const readModel = await listFacilityMapReadModel(org.orgId);
    revalidateFacilitiesRoutes(org.orgSlug, saved.id);

    return {
      ok: true,
      data: {
        facilityId: saved.id,
        readModel
      }
    };
  } catch (error) {
    rethrowIfNavigationError(error);
    return asError("Unable to save this facility.");
  }
}

export async function deleteFacilityAction(
  input: z.input<typeof deleteFacilitySchema>
): Promise<FacilitiesActionResult<{ readModel: FacilityMapReadModel }>> {
  const parsed = deleteFacilitySchema.safeParse(input);
  if (!parsed.success) {
    return asError("Invalid facility delete request.");
  }

  try {
    const payload = parsed.data;
    const org = await requireOrgPermission(payload.orgSlug, "spaces.write");
    await deleteFacilityRecord({
      orgId: org.orgId,
      facilityId: payload.facilityId
    });

    const readModel = await listFacilityMapReadModel(org.orgId);
    revalidateFacilitiesRoutes(org.orgSlug);

    return {
      ok: true,
      data: {
        readModel
      }
    };
  } catch (error) {
    rethrowIfNavigationError(error);
    return asError("Unable to delete this facility.");
  }
}

export async function upsertFacilityNodeAction(
  input: z.input<typeof facilityNodeSchema>
): Promise<FacilitiesActionResult<{ nodeId: string; facilityId: string; readModel: FacilityMapReadModel }>> {
  const parsed = facilityNodeSchema.safeParse(input);
  if (!parsed.success) {
    return asError("Please review the node details.");
  }

  try {
    const payload = parsed.data;
    const org = await requireOrgPermission(payload.orgSlug, "spaces.write");

    const facility = await getFacilityById(org.orgId, payload.facilityId);
    if (!facility) {
      return asError("Facility not found.");
    }

    const allNodes = await listFacilityNodes(org.orgId, { facilityId: payload.facilityId, includeArchived: true });
    const parentNodeId = payload.parentNodeId ?? null;

    if (parentNodeId) {
      const parent = allNodes.find((node) => node.id === parentNodeId);
      if (!parent) {
        return asError("Parent node not found.");
      }
    }

    const saved = payload.nodeId
      ? await (async () => {
          const nodeId = payload.nodeId;
          if (!nodeId) {
            return null;
          }

          const existing = allNodes.find((node) => node.id === nodeId);
          if (!existing) {
            return null;
          }

          const nextParentNodeId = payload.parentNodeId === undefined ? existing.parentNodeId : parentNodeId;
          if (nodeId === nextParentNodeId) {
            return null;
          }

          if (hasNodeParentCycle(allNodes, nodeId, nextParentNodeId)) {
            return null;
          }

          if (payload.nodeKind === "zone" && nextParentNodeId) {
            return null;
          }

          const nextNode: FacilityNode = {
            ...existing,
            parentNodeId: nextParentNodeId,
            name: payload.name,
            slug: toSlug(payload.slug ?? payload.name),
            nodeKind: payload.nodeKind,
            status: payload.status ?? existing.status,
            isBookable: payload.isBookable ?? existing.isBookable,
            capacity: payload.capacity ?? existing.capacity,
            layout: normalizeFacilityNodeLayout({ ...existing.layout, ...payload.layout }),
            metadataJson: payload.metadataJson ?? existing.metadataJson,
            sortIndex: payload.sortIndex ?? existing.sortIndex
          };

          const nextNodes = allNodes.map((node) => (node.id === existing.id ? nextNode : node));
          const containmentError = validateAreaContainment(nextNodes);
          if (containmentError) {
            return null;
          }

          return updateFacilityNodeRecord({
            orgId: org.orgId,
            nodeId,
            parentNodeId: nextNode.parentNodeId,
            name: nextNode.name,
            slug: nextNode.slug,
            nodeKind: nextNode.nodeKind,
            status: nextNode.status,
            isBookable: nextNode.isBookable,
            capacity: nextNode.capacity,
            layoutJson: nextNode.layout,
            metadataJson: nextNode.metadataJson,
            sortIndex: nextNode.sortIndex
          });
        })()
      : await (async () => {
          if (payload.nodeKind === "zone" && parentNodeId) {
            return null;
          }

          const creatingFirstArea = payload.nodeKind === "zone" && allNodes.every((node) => node.nodeKind !== "zone");

          const nextNode: FacilityNode = {
            id: "__draft__",
            orgId: org.orgId,
            facilityId: payload.facilityId,
            parentNodeId,
            name: payload.name,
            slug: toSlug(payload.slug ?? payload.name),
            nodeKind: payload.nodeKind,
            status: payload.status ?? "open",
            isBookable: payload.isBookable ?? true,
            capacity: payload.capacity ?? null,
            layout: normalizeFacilityNodeLayout(payload.layout),
            metadataJson: payload.metadataJson ?? {},
            sortIndex: payload.sortIndex ?? allNodes.length,
            createdAt: "",
            updatedAt: ""
          };

          if (!creatingFirstArea) {
            const containmentError = validateAreaContainment([...allNodes, nextNode]);
            if (containmentError) {
              return null;
            }
          }

          const created = await createFacilityNodeRecord({
            orgId: org.orgId,
            facilityId: payload.facilityId,
            parentNodeId,
            name: nextNode.name,
            slug: nextNode.slug,
            nodeKind: nextNode.nodeKind,
            status: nextNode.status,
            isBookable: nextNode.isBookable,
            capacity: nextNode.capacity,
            layoutJson: nextNode.layout,
            metadataJson: nextNode.metadataJson,
            sortIndex: nextNode.sortIndex
          });

          if (creatingFirstArea) {
            const orphanRootNodes = allNodes.filter((node) => node.parentNodeId === null && node.nodeKind !== "zone");
            await Promise.all(
              orphanRootNodes.map((node) =>
                updateFacilityNodeRecord({
                  orgId: org.orgId,
                  nodeId: node.id,
                  parentNodeId: created.id,
                  name: node.name,
                  slug: node.slug,
                  nodeKind: node.nodeKind,
                  status: node.status,
                  isBookable: node.isBookable,
                  capacity: node.capacity,
                  layoutJson: node.layout,
                  metadataJson: node.metadataJson,
                  sortIndex: node.sortIndex
                })
              )
            );
          }

          return created;
        })();

    if (!saved) {
      return asError("Invalid node update request. Areas must be top-level and all other nodes must be inside an area.");
    }

    const readModel = await listFacilityMapReadModel(org.orgId);
    revalidateFacilitiesRoutes(org.orgSlug, payload.facilityId);

    return {
      ok: true,
      data: {
        nodeId: saved.id,
        facilityId: payload.facilityId,
        readModel
      }
    };
  } catch (error) {
    rethrowIfNavigationError(error);
    return asError("Unable to save this facility node.");
  }
}

export async function deleteFacilityNodeAction(
  input: z.input<typeof deleteFacilityNodeSchema>
): Promise<FacilitiesActionResult<{ facilityId: string; readModel: FacilityMapReadModel }>> {
  const parsed = deleteFacilityNodeSchema.safeParse(input);
  if (!parsed.success) {
    return asError("Invalid node delete request.");
  }

  try {
    const payload = parsed.data;
    const org = await requireOrgPermission(payload.orgSlug, "spaces.write");
    const existing = await getFacilityNodeById(org.orgId, payload.nodeId);

    if (!existing) {
      return asError("Facility node not found.");
    }

    const nodes = await listFacilityNodes(org.orgId, { facilityId: existing.facilityId, includeArchived: true });
    const childCount = nodes.filter((node) => node.parentNodeId === existing.id).length;
    if (childCount > 0) {
      return asError("Delete child nodes first.");
    }

    if (existing.nodeKind === "zone") {
      const areaCount = nodes.filter((node) => node.nodeKind === "zone").length;
      if (areaCount <= 1) {
        return asError("Each facility map must have at least one area.");
      }
    }

    await deleteFacilityNodeRecord({
      orgId: org.orgId,
      nodeId: payload.nodeId
    });

    const readModel = await listFacilityMapReadModel(org.orgId);
    revalidateFacilitiesRoutes(org.orgSlug, existing.facilityId);

    return {
      ok: true,
      data: {
        facilityId: existing.facilityId,
        readModel
      }
    };
  } catch (error) {
    rethrowIfNavigationError(error);
    return asError("Unable to delete this facility node.");
  }
}

export async function saveFacilityMapDraftAction(
  input: z.input<typeof saveFacilityMapDraftSchema>
): Promise<FacilitiesActionResult<{ updatedAtUtc: string }>> {
  const parsed = saveFacilityMapDraftSchema.safeParse(input);
  if (!parsed.success) {
    return asError("Invalid map draft payload.");
  }

  try {
    const payload = parsed.data;
    const org = await requireOrgPermission(payload.orgSlug, "spaces.write");
    const facility = await getFacilityById(org.orgId, payload.facilityId);
    if (!facility) {
      return asError("Facility not found.");
    }

    const normalizedNodes = payload.nodes.map((node) => ({
      ...node,
      layout: normalizeFacilityNodeLayout(node.layout),
      metadataJson: asObject(node.metadataJson)
    }));

    const updatedAtUtc = new Date().toISOString();
    const nextMetadataJson = {
      ...facility.metadataJson,
      mapDraft: {
        version: 1,
        updatedAtUtc,
        nodes: normalizedNodes
      }
    };

    await updateFacilityMetadataRecord({
      orgId: org.orgId,
      facilityId: facility.id,
      metadataJson: nextMetadataJson
    });

    return {
      ok: true,
      data: {
        updatedAtUtc
      }
    };
  } catch (error) {
    rethrowIfNavigationError(error);
    return asError("Unable to save facility map draft.");
  }
}

export async function publishFacilityMapDraftAction(
  input: z.input<typeof publishFacilityMapDraftSchema>
): Promise<FacilitiesActionResult<{ readModel: FacilityMapReadModel }>> {
  const parsed = publishFacilityMapDraftSchema.safeParse(input);
  if (!parsed.success) {
    return asError("Invalid publish request.");
  }

  try {
    const payload = parsed.data;
    const org = await requireOrgPermission(payload.orgSlug, "spaces.write");
    const facility = await getFacilityById(org.orgId, payload.facilityId);
    if (!facility) {
      return asError("Facility not found.");
    }

    const draft = parseFacilityMapDraft(facility.metadataJson);
    if (!draft) {
      return asError("No draft found to publish.");
    }

    const draftValidationError = validateDraftNodes(draft.nodes);
    if (draftValidationError) {
      return asError(draftValidationError);
    }

    const existingNodes = await listFacilityNodes(org.orgId, {
      facilityId: facility.id,
      includeArchived: true
    });
    const existingById = new Map(existingNodes.map((node) => [node.id, node]));
    const draftById = new Map(draft.nodes.map((node) => [node.id, node]));
    const orderedDraftIds = buildTopologicalDraftOrder(draft.nodes);
    const publishedIdByDraftId = new Map<string, string>();
    const keptPublishedIds = new Set<string>();

    for (const draftNodeId of orderedDraftIds) {
      const draftNode = draftById.get(draftNodeId);
      if (!draftNode) {
        return asError("Draft is invalid.");
      }

      const parentPublishedId = draftNode.parentId ? (publishedIdByDraftId.get(draftNode.parentId) ?? null) : null;
      const sourcePublishedId = draftNode.publishedNodeId;
      const nodeKind = draftNode.nodeKind as FacilityNodeKind;

      if (sourcePublishedId && existingById.has(sourcePublishedId)) {
        const existing = existingById.get(sourcePublishedId);
        if (!existing) {
          return asError("Draft is invalid.");
        }

        await updateFacilityNodeRecord({
          orgId: org.orgId,
          nodeId: sourcePublishedId,
          parentNodeId: parentPublishedId,
          name: draftNode.name,
          slug: toSlug(draftNode.name),
          nodeKind,
          status: draftNode.status,
          isBookable: draftNode.isBookable,
          capacity: draftNode.capacity,
          layoutJson: normalizeFacilityNodeLayout(draftNode.layout),
          metadataJson: draftNode.metadataJson,
          sortIndex: draftNode.sortIndex
        });
        keptPublishedIds.add(sourcePublishedId);
        publishedIdByDraftId.set(draftNodeId, sourcePublishedId);
        continue;
      }

      const created = await createFacilityNodeRecord({
        orgId: org.orgId,
        facilityId: facility.id,
        parentNodeId: parentPublishedId,
        name: draftNode.name,
        slug: toSlug(draftNode.name),
        nodeKind,
        status: draftNode.status,
        isBookable: draftNode.isBookable,
        capacity: draftNode.capacity,
        layoutJson: normalizeFacilityNodeLayout(draftNode.layout),
        metadataJson: draftNode.metadataJson,
        sortIndex: draftNode.sortIndex
      });
      keptPublishedIds.add(created.id);
      publishedIdByDraftId.set(draftNodeId, created.id);
    }

    const parentById = new Map(existingNodes.map((node) => [node.id, node.parentNodeId]));
    const removedNodes = existingNodes.filter((node) => !keptPublishedIds.has(node.id));
    removedNodes.sort((a, b) => {
      const depth = (nodeId: string) => {
        let count = 0;
        let cursor = parentById.get(nodeId) ?? null;
        while (cursor) {
          count += 1;
          cursor = parentById.get(cursor) ?? null;
        }
        return count;
      };
      return depth(b.id) - depth(a.id);
    });

    for (const removed of removedNodes) {
      await deleteFacilityNodeRecord({
        orgId: org.orgId,
        nodeId: removed.id
      });
    }

    const nextMetadataJson = { ...facility.metadataJson };
    delete (nextMetadataJson as Record<string, unknown>).mapDraft;
    await updateFacilityMetadataRecord({
      orgId: org.orgId,
      facilityId: facility.id,
      metadataJson: nextMetadataJson
    });

    const readModel = await listFacilityMapReadModel(org.orgId);
    revalidateFacilitiesRoutes(org.orgSlug, facility.id);

    return {
      ok: true,
      data: {
        readModel
      }
    };
  } catch (error) {
    rethrowIfNavigationError(error);
    return asError("Unable to publish facility map draft.");
  }
}

export async function getFacilityBookingMapSnapshotAction(
  input: z.input<typeof bookingSnapshotSchema>
): Promise<FacilitiesActionResult<{ snapshot: NonNullable<Awaited<ReturnType<typeof getFacilityBookingMapSnapshotForOccurrence>>> }>> {
  const parsed = bookingSnapshotSchema.safeParse(input);
  if (!parsed.success) {
    return asError("Invalid booking map request.");
  }

  try {
    const payload = parsed.data;
    const orgContext = await getOrgAuthContext(payload.orgSlug);
    const canReadBookingMap =
      can(orgContext.membershipPermissions, "spaces.read") ||
      can(orgContext.membershipPermissions, "spaces.write") ||
      can(orgContext.membershipPermissions, "calendar.read") ||
      can(orgContext.membershipPermissions, "calendar.write") ||
      can(orgContext.membershipPermissions, "programs.write") ||
      can(orgContext.membershipPermissions, "org.manage.read");

    if (!canReadBookingMap) {
      return asError("You do not have access to facility booking data.");
    }

    const snapshot = await getFacilityBookingMapSnapshotForOccurrence(orgContext.orgId, payload.occurrenceId);
    if (!snapshot) {
      return asError("Occurrence not found.");
    }

    return {
      ok: true,
      data: {
        snapshot
      }
    };
  } catch (error) {
    rethrowIfNavigationError(error);
    return asError("Unable to load booking map snapshot.");
  }
}

export async function getFacilityMapReadModelAction(input: {
  orgSlug: string;
}): Promise<FacilitiesActionResult<{ readModel: FacilityMapReadModel }>> {
  try {
    const org = await requireOrgPermission(input.orgSlug, "spaces.read");
    const readModel = await listFacilityMapReadModel(org.orgId);
    return {
      ok: true,
      data: {
        readModel
      }
    };
  } catch (error) {
    rethrowIfNavigationError(error);
    return asError("Unable to load facilities.");
  }
}
