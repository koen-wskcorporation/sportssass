"use client";

import { useMemo, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AssetTile } from "@/components/ui/asset-tile";
import { useToast } from "@/components/ui/toast";
import { getOrgAssetPublicUrl } from "@/lib/branding/getOrgAssetPublicUrl";
import { saveProgramHierarchyAction, saveProgramScheduleAction, updateProgramAction } from "@/modules/programs/actions";
import type { ProgramWithDetails } from "@/modules/programs/types";

type ProgramEditorPanelProps = {
  orgSlug: string;
  data: ProgramWithDetails;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ProgramEditorPanel({ orgSlug, data }: ProgramEditorPanelProps) {
  const { toast } = useToast();
  const [isSavingProgram, startSavingProgram] = useTransition();
  const [isMutatingNodes, startMutatingNodes] = useTransition();
  const [isMutatingSchedule, startMutatingSchedule] = useTransition();
  const [nodes, setNodes] = useState(data.nodes);
  const [scheduleBlocks, setScheduleBlocks] = useState(data.scheduleBlocks);
  const [savedSlug, setSavedSlug] = useState(data.program.slug);

  const [name, setName] = useState(data.program.name);
  const [slug, setSlug] = useState(data.program.slug);
  const [description, setDescription] = useState(data.program.description ?? "");
  const [programType, setProgramType] = useState(data.program.programType);
  const [customTypeLabel, setCustomTypeLabel] = useState(data.program.customTypeLabel ?? "");
  const [status, setStatus] = useState(data.program.status);
  const [startDate, setStartDate] = useState(data.program.startDate ?? "");
  const [endDate, setEndDate] = useState(data.program.endDate ?? "");
  const [coverImagePath, setCoverImagePath] = useState(data.program.coverImagePath ?? "");

  const [nodeName, setNodeName] = useState("");
  const [nodeSlug, setNodeSlug] = useState("");
  const [nodeKind, setNodeKind] = useState<"division" | "subdivision">("division");
  const [parentId, setParentId] = useState<string>("");
  const [capacity, setCapacity] = useState("");
  const [waitlistEnabled, setWaitlistEnabled] = useState(true);

  const [scheduleType, setScheduleType] = useState<"date_range" | "meeting_pattern" | "one_off">("date_range");
  const [scheduleTitle, setScheduleTitle] = useState("");
  const [scheduleNodeId, setScheduleNodeId] = useState("");
  const [scheduleStartDate, setScheduleStartDate] = useState("");
  const [scheduleEndDate, setScheduleEndDate] = useState("");
  const [scheduleStartTime, setScheduleStartTime] = useState("");
  const [scheduleEndTime, setScheduleEndTime] = useState("");
  const [scheduleByDay, setScheduleByDay] = useState("");
  const [scheduleOneOffAt, setScheduleOneOffAt] = useState("");

  const parentOptions = useMemo(
    () => [
      { value: "", label: "(Root division)" },
      ...nodes.map((node) => ({
        value: node.id,
        label: `${node.name} (${node.nodeKind})`
      }))
    ],
    [nodes]
  );

  async function handleProgramSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startSavingProgram(async () => {
      const result = await updateProgramAction({
        orgSlug,
        programId: data.program.id,
        slug,
        name,
        description,
        programType,
        customTypeLabel,
        status,
        startDate,
        endDate,
        coverImagePath,
        registrationOpenAt: data.program.registrationOpenAt ?? undefined,
        registrationCloseAt: data.program.registrationCloseAt ?? undefined
      });

      if (!result.ok) {
        toast({
          title: "Unable to save program",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Program saved",
        variant: "success"
      });
      setSavedSlug(slug);
    });
  }

  function handleNodeCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const resolvedSlug = nodeSlug || slugify(nodeName);
    if (!resolvedSlug) {
      toast({
        title: "Missing node slug",
        variant: "destructive"
      });
      return;
    }

    startMutatingNodes(async () => {
      const result = await saveProgramHierarchyAction({
        orgSlug,
        programId: data.program.id,
        action: "create",
        parentId: parentId || null,
        name: nodeName,
        slug: resolvedSlug,
        nodeKind,
        capacity: capacity ? Number.parseInt(capacity, 10) : null,
        waitlistEnabled
      });

      if (!result.ok) {
        toast({
          title: "Unable to add division",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      setNodeName("");
      setNodeSlug("");
      setParentId("");
      setCapacity("");
      setNodeKind("division");
      setWaitlistEnabled(true);
      setNodes(result.data.details.nodes);
      setScheduleBlocks(result.data.details.scheduleBlocks);
      toast({ title: "Division added", variant: "success" });
    });
  }

  function handleNodeDelete(nodeId: string) {
    startMutatingNodes(async () => {
      const result = await saveProgramHierarchyAction({
        orgSlug,
        programId: data.program.id,
        action: "delete",
        nodeId
      });

      if (!result.ok) {
        toast({
          title: "Unable to delete node",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      toast({ title: "Node deleted", variant: "success" });
      setNodes(result.data.details.nodes);
      setScheduleBlocks(result.data.details.scheduleBlocks);
    });
  }

  function handleScheduleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const byDay = scheduleByDay
      .split(",")
      .map((part) => Number.parseInt(part.trim(), 10))
      .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);

    startMutatingSchedule(async () => {
      const result = await saveProgramScheduleAction({
        orgSlug,
        programId: data.program.id,
        action: "create",
        blockType: scheduleType,
        title: scheduleTitle,
        programNodeId: scheduleNodeId || null,
        startDate: scheduleStartDate,
        endDate: scheduleEndDate,
        startTime: scheduleStartTime,
        endTime: scheduleEndTime,
        byDay: byDay.length > 0 ? byDay : undefined,
        oneOffAt: scheduleOneOffAt || undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });

      if (!result.ok) {
        toast({
          title: "Unable to add schedule block",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      setScheduleTitle("");
      setScheduleNodeId("");
      setScheduleStartDate("");
      setScheduleEndDate("");
      setScheduleStartTime("");
      setScheduleEndTime("");
      setScheduleByDay("");
      setScheduleOneOffAt("");
      setNodes(result.data.details.nodes);
      setScheduleBlocks(result.data.details.scheduleBlocks);
      toast({ title: "Schedule block added", variant: "success" });
    });
  }

  function handleScheduleDelete(scheduleBlockId: string) {
    startMutatingSchedule(async () => {
      const result = await saveProgramScheduleAction({
        orgSlug,
        programId: data.program.id,
        action: "delete",
        scheduleBlockId
      });

      if (!result.ok) {
        toast({
          title: "Unable to delete schedule block",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      toast({ title: "Schedule block deleted", variant: "success" });
      setNodes(result.data.details.nodes);
      setScheduleBlocks(result.data.details.scheduleBlocks);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Program settings</CardTitle>
          <CardDescription>Configure the core program details and publish state.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleProgramSave}>
            <FormField label="Program name">
              <Input onChange={(event) => setName(event.target.value)} required value={name} />
            </FormField>
            <FormField label="Slug">
              <Input
                onChange={(event) => setSlug(slugify(event.target.value))}
                required
                slugValidation={{
                  kind: "program",
                  orgSlug,
                  currentSlug: savedSlug
                }}
                value={slug}
              />
            </FormField>
            <FormField label="Type">
              <Select
                onChange={(event) => setProgramType(event.target.value as "league" | "season" | "clinic" | "custom")}
                options={[
                  { value: "league", label: "League" },
                  { value: "season", label: "Season" },
                  { value: "clinic", label: "Clinic" },
                  { value: "custom", label: "Custom" }
                ]}
                value={programType}
              />
            </FormField>
            <FormField label="Status">
              <Select
                onChange={(event) => setStatus(event.target.value as "draft" | "published" | "archived")}
                options={[
                  { value: "draft", label: "Draft" },
                  { value: "published", label: "Published" },
                  { value: "archived", label: "Archived" }
                ]}
                value={status}
              />
            </FormField>
            {programType === "custom" ? (
              <FormField className="md:col-span-2" label="Custom type label">
                <Input onChange={(event) => setCustomTypeLabel(event.target.value)} required value={customTypeLabel} />
              </FormField>
            ) : null}
            <FormField className="md:col-span-2" label="Description">
              <Textarea className="min-h-[80px]" onChange={(event) => setDescription(event.target.value)} value={description} />
            </FormField>
            <FormField label="Cover photo">
              <AssetTile
                constraints={{
                  accept: "image/*,.svg",
                  maxSizeMB: 10,
                  aspect: "wide",
                  recommendedPx: {
                    w: 1600,
                    h: 900
                  }
                }}
                fit="cover"
                initialPath={coverImagePath || null}
                initialUrl={getOrgAssetPublicUrl(coverImagePath)}
                kind="org"
                onChange={(asset) => setCoverImagePath(asset.path)}
                onRemove={() => setCoverImagePath("")}
                orgSlug={orgSlug}
                purpose="program-cover"
                specificationText="PNG, JPG, WEBP, or SVG"
                title="Program cover"
              />
            </FormField>
            <FormField label="Start date">
              <Input onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} />
            </FormField>
            <FormField label="End date">
              <Input onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} />
            </FormField>
            <div className="md:col-span-2">
              <Button disabled={isSavingProgram} loading={isSavingProgram} type="submit">
                {isSavingProgram ? "Saving..." : "Save program"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Divisions and subdivisions</CardTitle>
          <CardDescription>Add root divisions and nested subdivisions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-3 md:grid-cols-2" onSubmit={handleNodeCreate}>
            <FormField label="Name">
              <Input onChange={(event) => setNodeName(event.target.value)} required value={nodeName} />
            </FormField>
            <FormField hint="Optional, auto-generated if blank." label="Slug">
              <Input onChange={(event) => setNodeSlug(slugify(event.target.value))} value={nodeSlug} />
            </FormField>
            <FormField label="Kind">
              <Select
                onChange={(event) => setNodeKind(event.target.value as "division" | "subdivision")}
                options={[
                  { value: "division", label: "Division" },
                  { value: "subdivision", label: "Subdivision" }
                ]}
                value={nodeKind}
              />
            </FormField>
            <FormField label="Parent">
              <Select onChange={(event) => setParentId(event.target.value)} options={parentOptions} value={parentId} />
            </FormField>
            <FormField hint="Optional" label="Capacity">
              <Input onChange={(event) => setCapacity(event.target.value)} type="number" value={capacity} />
            </FormField>
            <label className="inline-flex items-center gap-2 rounded-control border bg-surface px-3 py-2 text-sm text-text">
              <input checked={waitlistEnabled} onChange={(event) => setWaitlistEnabled(event.target.checked)} type="checkbox" />
              Waitlist enabled
            </label>
            <div className="md:col-span-2">
              <Button disabled={isMutatingNodes} loading={isMutatingNodes} type="submit" variant="secondary">
                {isMutatingNodes ? "Saving..." : "Add node"}
              </Button>
            </div>
          </form>

          {nodes.length === 0 ? <Alert variant="info">No divisions created yet.</Alert> : null}
          {nodes.map((node) => (
            <div className="flex items-start justify-between rounded-control border bg-surface px-3 py-3" key={node.id}>
              <div>
                <p className="font-semibold text-text">
                  {node.name} <span className="text-xs font-medium text-text-muted">({node.nodeKind})</span>
                </p>
                <p className="text-xs text-text-muted">slug: {node.slug}</p>
                <p className="text-xs text-text-muted">
                  capacity: {node.capacity ?? "none"} · waitlist: {node.waitlistEnabled ? "on" : "off"}
                </p>
              </div>
              <Button disabled={isMutatingNodes} onClick={() => handleNodeDelete(node.id)} size="sm" type="button" variant="destructive">
                Delete
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schedule blocks</CardTitle>
          <CardDescription>Model long-running seasons or one-off clinics.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-3 md:grid-cols-2" onSubmit={handleScheduleCreate}>
            <FormField label="Block type">
              <Select
                onChange={(event) => setScheduleType(event.target.value as "date_range" | "meeting_pattern" | "one_off")}
                options={[
                  { value: "date_range", label: "Date range" },
                  { value: "meeting_pattern", label: "Meeting pattern" },
                  { value: "one_off", label: "One-off" }
                ]}
                value={scheduleType}
              />
            </FormField>
            <FormField hint="Optional" label="Title">
              <Input onChange={(event) => setScheduleTitle(event.target.value)} value={scheduleTitle} />
            </FormField>
            <FormField label="Target node">
              <Select onChange={(event) => setScheduleNodeId(event.target.value)} options={parentOptions} value={scheduleNodeId} />
            </FormField>
            {scheduleType !== "one_off" ? (
              <>
                <FormField label="Start date">
                  <Input onChange={(event) => setScheduleStartDate(event.target.value)} type="date" value={scheduleStartDate} />
                </FormField>
                <FormField label="End date">
                  <Input onChange={(event) => setScheduleEndDate(event.target.value)} type="date" value={scheduleEndDate} />
                </FormField>
              </>
            ) : (
              <FormField label="One-off at">
                <Input onChange={(event) => setScheduleOneOffAt(event.target.value)} type="datetime-local" value={scheduleOneOffAt} />
              </FormField>
            )}
            <FormField hint="For meeting pattern only. Example: 2,4 (Tue/Thu)." label="By day">
              <Input onChange={(event) => setScheduleByDay(event.target.value)} value={scheduleByDay} />
            </FormField>
            <FormField hint="Optional" label="Start time">
              <Input onChange={(event) => setScheduleStartTime(event.target.value)} type="time" value={scheduleStartTime} />
            </FormField>
            <FormField hint="Optional" label="End time">
              <Input onChange={(event) => setScheduleEndTime(event.target.value)} type="time" value={scheduleEndTime} />
            </FormField>
            <div className="md:col-span-2">
              <Button disabled={isMutatingSchedule} loading={isMutatingSchedule} type="submit" variant="secondary">
                {isMutatingSchedule ? "Saving..." : "Add schedule block"}
              </Button>
            </div>
          </form>

          {scheduleBlocks.length === 0 ? <Alert variant="info">No schedule blocks yet.</Alert> : null}
          {scheduleBlocks.map((schedule) => (
            <div className="flex items-start justify-between rounded-control border bg-surface px-3 py-3" key={schedule.id}>
              <div>
                <p className="font-semibold text-text">{schedule.title ?? "Untitled block"}</p>
                <p className="text-xs text-text-muted">type: {schedule.blockType}</p>
                <p className="text-xs text-text-muted">
                  {schedule.blockType === "one_off"
                    ? schedule.oneOffAt ?? ""
                    : `${schedule.startDate ?? ""} → ${schedule.endDate ?? ""}`}
                </p>
              </div>
              <Button
                disabled={isMutatingSchedule}
                onClick={() => handleScheduleDelete(schedule.id)}
                size="sm"
                type="button"
                variant="destructive"
              >
                Delete
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
