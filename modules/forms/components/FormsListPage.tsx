"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { archiveFormAction, createFormAction, duplicateFormAction } from "@/modules/forms/actions";
import type { FormListItem } from "@/modules/forms/types";

type FormsListPageProps = {
  orgSlug: string;
  forms: FormListItem[];
  canWrite: boolean;
};

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function FormsListPage({ orgSlug, forms, canWrite }: FormsListPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const nameFieldId = useId();
  const slugFieldId = useId();

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canWrite || isPending) {
      return;
    }

    startTransition(async () => {
      setBusyKey("create");
      const result = await createFormAction({
        orgSlug,
        name,
        slug
      });

      if (!result.ok) {
        toast({
          title: "Unable to create form",
          description: result.error,
          variant: "destructive"
        });
        setBusyKey(null);
        return;
      }

      setName("");
      setSlug("");
      setIsCreateDialogOpen(false);
      setBusyKey(null);
      router.push(`/${orgSlug}/tools/forms/${result.formId}/edit`);
      router.refresh();
    });
  }

  function handleDuplicate(formId: string) {
    if (!canWrite || isPending) {
      return;
    }

    startTransition(async () => {
      setBusyKey(`duplicate:${formId}`);
      const result = await duplicateFormAction({
        orgSlug,
        formId
      });

      if (!result.ok) {
        toast({
          title: "Unable to duplicate form",
          description: result.error,
          variant: "destructive"
        });
        setBusyKey(null);
        return;
      }

      setBusyKey(null);
      router.push(`/${orgSlug}/tools/forms/${result.formId}/edit`);
      router.refresh();
    });
  }

  function handleArchive(formId: string) {
    if (!canWrite || isPending) {
      return;
    }

    const confirmed = window.confirm("Archive this form? It will no longer be shown as active.");

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      setBusyKey(`archive:${formId}`);
      const result = await archiveFormAction({
        orgSlug,
        formId
      });

      if (!result.ok) {
        toast({
          title: "Unable to archive form",
          description: result.error,
          variant: "destructive"
        });
        setBusyKey(null);
        return;
      }

      setBusyKey(null);
      toast({
        title: "Form archived",
        variant: "success"
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          canWrite ? (
            <Button disabled={isPending} onClick={() => setIsCreateDialogOpen(true)} type="button">
              New form
            </Button>
          ) : null
        }
        description="Create, publish, and manage reusable forms for your organization."
        title="Forms"
      />

      {!canWrite ? <Alert variant="warning">Your role can view forms but cannot create, edit, or publish.</Alert> : null}

      <Dialog
        onClose={() => {
          if (isPending) {
            return;
          }

          setIsCreateDialogOpen(false);
        }}
        open={isCreateDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create form</DialogTitle>
            <DialogDescription>Start with a basic template and customize fields in the builder.</DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={handleCreate}>
            <FormField htmlFor={nameFieldId} label="Name">
              <Input
                disabled={!canWrite || isPending}
                id={nameFieldId}
                onChange={(event) => setName(event.target.value)}
                placeholder="Volunteer Signup"
                required
                value={name}
              />
            </FormField>

            <FormField hint="Optional. Auto-generated from name when empty." htmlFor={slugFieldId} label="Slug">
              <Input
                disabled={!canWrite || isPending}
                id={slugFieldId}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="volunteer-signup"
                value={slug}
              />
            </FormField>

            <DialogFooter>
              <Button disabled={isPending} onClick={() => setIsCreateDialogOpen(false)} type="button" variant="ghost">
                Cancel
              </Button>
              <Button disabled={!canWrite || isPending} type="submit">
                {busyKey === "create" ? "Creating..." : "Create form"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Form library</CardTitle>
          <CardDescription>Published forms can be embedded in pages and accessed from public form routes.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last published</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.length === 0 ? (
                <TableRow>
                  <TableCell className="py-8 text-center text-text-muted" colSpan={5}>
                    No forms yet.
                  </TableCell>
                </TableRow>
              ) : (
                forms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell className="font-semibold">{form.name}</TableCell>
                    <TableCell className="font-mono text-xs">{form.slug}</TableCell>
                    <TableCell>{form.status}</TableCell>
                    <TableCell>{formatDate(form.lastPublishedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link className={buttonVariants({ size: "sm", variant: "ghost" })} href={`/${orgSlug}/tools/forms/${form.id}/edit`}>
                          Edit
                        </Link>
                        <Link className={buttonVariants({ size: "sm", variant: "ghost" })} href={`/${orgSlug}/tools/forms/${form.id}/submissions`}>
                          Submissions
                        </Link>
                        {canWrite ? (
                          <Button
                            disabled={isPending}
                            onClick={() => handleDuplicate(form.id)}
                            size="sm"
                            type="button"
                            variant="secondary"
                          >
                            {busyKey === `duplicate:${form.id}` ? "Duplicating..." : "Duplicate"}
                          </Button>
                        ) : null}
                        {canWrite ? (
                          <Button
                            disabled={isPending || form.status === "archived"}
                            onClick={() => handleArchive(form.id)}
                            size="sm"
                            type="button"
                            variant="destructive"
                          >
                            {busyKey === `archive:${form.id}` ? "Archiving..." : "Archive"}
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
