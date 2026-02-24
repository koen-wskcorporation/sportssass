"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormCreatePanel } from "@/modules/forms/components/FormCreatePanel";
import type { OrgForm } from "@/modules/forms/types";
import type { Program } from "@/modules/programs/types";

type FormsManagePanelProps = {
  orgSlug: string;
  forms: OrgForm[];
  programs: Program[];
  canWrite?: boolean;
};

export function FormsManagePanel({ orgSlug, forms, programs, canWrite = true }: FormsManagePanelProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const sortedForms = useMemo(() => [...forms].sort((a, b) => a.name.localeCompare(b.name)), [forms]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Forms</CardTitle>
            <Button disabled={!canWrite} onClick={() => setIsCreateOpen(true)} type="button">
              <Plus className="h-4 w-4" />
              Create form
            </Button>
          </div>
          <CardDescription>Open forms to edit schema, versions, and submissions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedForms.length === 0 ? <Alert variant="info">No forms yet.</Alert> : null}
          {sortedForms.map((form) => (
            <Link className="block rounded-control border bg-surface px-3 py-3 hover:bg-surface-muted" href={`/${orgSlug}/tools/forms/${form.id}/editor`} key={form.id}>
              <p className="font-semibold text-text">{form.name}</p>
              <p className="text-xs text-text-muted">
                {form.formKind === "program_registration" ? "Program registration" : "Generic"} · {form.status}
              </p>
              <p className="mt-1 text-sm text-text-muted">/{orgSlug}/register/{form.slug}</p>
            </Link>
          ))}
        </CardContent>
      </Card>

      <FormCreatePanel canWrite={canWrite} onClose={() => setIsCreateOpen(false)} open={isCreateOpen} orgSlug={orgSlug} programs={programs} />
    </div>
  );
}
