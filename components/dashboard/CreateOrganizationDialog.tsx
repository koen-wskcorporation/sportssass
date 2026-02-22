"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useSiteOrigin } from "@/lib/hooks/useSiteOrigin";
import { createOrganizationAction } from "@/app/account/organizations/actions";

export function CreateOrganizationDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const orgNameId = useId();
  const orgSlugId = useId();
  const siteOrigin = useSiteOrigin();

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending) {
      return;
    }

    startTransition(async () => {
      const result = await createOrganizationAction({
        orgName,
        orgSlug
      });

      if (!result.ok) {
        toast({
          title: "Unable to create organization",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      setOpen(false);
      setOrgName("");
      setOrgSlug("");
      router.push(`/${result.orgSlug}/manage`);
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" variant="secondary">
        Create organization
      </Button>

      <Dialog onClose={() => setOpen(false)} open={open}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Create organization</DialogTitle>
            <DialogDescription>Set up a new organization workspace and become its first admin.</DialogDescription>
          </DialogHeader>

          <form className="space-y-3" onSubmit={handleCreate}>
            <FormField hint="Shown across public and staff pages." htmlFor={orgNameId} label="Organization name">
              <Input
                id={orgNameId}
                maxLength={120}
                name="orgName"
                onChange={(event) => setOrgName(event.target.value)}
                required
                value={orgName}
              />
            </FormField>
            <FormField hint="Optional. Used in URLs like /my-club." htmlFor={orgSlugId} label="URL slug">
              <Input
                id={orgSlugId}
                maxLength={120}
                name="orgSlug"
                onChange={(event) => setOrgSlug(event.target.value)}
                persistentPrefix={`${siteOrigin || ""}/`}
                slugValidation={{ kind: "org" }}
                value={orgSlug}
              />
            </FormField>

            <div className="flex justify-end gap-2">
              <Button disabled={isPending} onClick={() => setOpen(false)} type="button" variant="ghost">
                Cancel
              </Button>
              <Button disabled={isPending} loading={isPending} type="submit">
                {isPending ? "Creating..." : "Create organization"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
