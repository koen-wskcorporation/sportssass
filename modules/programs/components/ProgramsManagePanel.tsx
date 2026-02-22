"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AssetTile } from "@/components/ui/asset-tile";
import { useToast } from "@/components/ui/toast";
import { getOrgAssetPublicUrl } from "@/lib/branding/getOrgAssetPublicUrl";
import { createProgramAction } from "@/modules/programs/actions";
import type { Program } from "@/modules/programs/types";

type ProgramsManagePanelProps = {
  orgSlug: string;
  programs: Program[];
  canWrite?: boolean;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ProgramsManagePanel({ orgSlug, programs, canWrite = true }: ProgramsManagePanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [programType, setProgramType] = useState<"league" | "season" | "clinic" | "custom">("season");
  const [customTypeLabel, setCustomTypeLabel] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [coverImagePath, setCoverImagePath] = useState("");

  const sortedPrograms = useMemo(() => {
    return [...programs].sort((a, b) => a.name.localeCompare(b.name));
  }, [programs]);

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canWrite) {
      return;
    }

    const resolvedSlug = slug || slugify(name);
    if (!resolvedSlug) {
      toast({
        title: "Missing slug",
        description: "Provide a program name or slug.",
        variant: "destructive"
      });
      return;
    }

    startSaving(async () => {
      const result = await createProgramAction({
        orgSlug,
        slug: resolvedSlug,
        name,
        description,
        programType,
        customTypeLabel,
        status,
        startDate,
        endDate,
        coverImagePath,
        registrationOpenAt: undefined,
        registrationCloseAt: undefined
      });

      if (!result.ok) {
        toast({
          title: "Unable to create program",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Program created",
        variant: "success"
      });
      setIsCreateOpen(false);
      setName("");
      setSlug("");
      setDescription("");
      setCustomTypeLabel("");
      setStatus("draft");
      setProgramType("season");
      setStartDate("");
      setEndDate("");
      setCoverImagePath("");
      router.push(`/${orgSlug}/manage/programs/${result.data.programId}`);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Programs</CardTitle>
            <Button disabled={!canWrite} onClick={() => setIsCreateOpen(true)} type="button">
              <Plus className="h-4 w-4" />
              Create program
            </Button>
          </div>
          <CardDescription>Manage divisions, schedules, and linked forms.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedPrograms.length === 0 ? <Alert variant="info">No programs yet.</Alert> : null}
          {sortedPrograms.map((program) => (
            <Link className="block rounded-control border bg-surface px-3 py-3 hover:bg-surface-muted" href={`/${orgSlug}/manage/programs/${program.id}`} key={program.id}>
              <p className="font-semibold text-text">{program.name}</p>
              <p className="text-xs text-text-muted">
                {program.programType === "custom" ? program.customTypeLabel ?? "Custom" : program.programType} · {program.status}
              </p>
              <p className="mt-1 text-sm text-text-muted">/{orgSlug}/programs/{program.slug}</p>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Dialog onClose={() => setIsCreateOpen(false)} open={isCreateOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Create program</DialogTitle>
            <DialogDescription>Set up leagues, seasons, clinics, and custom programs.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
            <FormField label="Program name">
              <Input disabled={!canWrite} onChange={(event) => setName(event.target.value)} required value={name} />
            </FormField>
            <FormField hint="Auto-generated from name if blank." label="Slug">
              <Input
                disabled={!canWrite}
                onChange={(event) => setSlug(slugify(event.target.value))}
                slugValidation={{
                  kind: "program",
                  orgSlug
                }}
                value={slug}
              />
            </FormField>
            <FormField label="Type">
              <Select
                disabled={!canWrite}
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
                disabled={!canWrite}
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
                <Input disabled={!canWrite} onChange={(event) => setCustomTypeLabel(event.target.value)} required value={customTypeLabel} />
              </FormField>
            ) : null}
            <FormField className="md:col-span-2" label="Description">
              <Textarea className="min-h-[90px]" disabled={!canWrite} onChange={(event) => setDescription(event.target.value)} value={description} />
            </FormField>
            <FormField className="md:col-span-2" label="Cover photo">
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
                disabled={!canWrite}
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
              <Input disabled={!canWrite} onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} />
            </FormField>
            <FormField label="End date">
              <Input disabled={!canWrite} onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} />
            </FormField>
            <div className="md:col-span-2 flex gap-2">
              <Button disabled={isSaving || !canWrite} loading={isSaving} type="submit">
                {isSaving ? "Saving..." : "Create program"}
              </Button>
              <Button onClick={() => setIsCreateOpen(false)} type="button" variant="ghost">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
