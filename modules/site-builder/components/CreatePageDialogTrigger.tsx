"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createOrgPageAction } from "@/modules/site-builder/actions";

type CreatePageDialogTriggerProps = {
  orgSlug: string;
  canWrite: boolean;
  triggerLabel?: string;
  triggerVariant?: "primary" | "secondary" | "ghost" | "link" | "destructive";
  triggerSize?: "sm" | "md" | "lg";
  triggerClassName?: string;
};

function pageHref(orgSlug: string, pageSlug: string) {
  if (pageSlug === "home") {
    return `/${orgSlug}`;
  }

  return `/${orgSlug}/${pageSlug}`;
}

export function CreatePageDialogTrigger({
  orgSlug,
  canWrite,
  triggerLabel = "New page",
  triggerVariant = "secondary",
  triggerSize = "sm",
  triggerClassName
}: CreatePageDialogTriggerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [pageSlug, setPageSlug] = useState("");
  const [isPending, startTransition] = useTransition();
  const titleId = useId();
  const slugId = useId();

  function closeDialog() {
    if (isPending) {
      return;
    }

    setIsOpen(false);
  }

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canWrite || isPending) {
      return;
    }

    const nextSlug = pageSlug.trim();

    if (!nextSlug) {
      toast({
        title: "Missing page URL",
        description: "Enter a page URL before creating.",
        variant: "destructive"
      });
      return;
    }

    startTransition(async () => {
      const result = await createOrgPageAction({
        orgSlug,
        pageSlug: nextSlug,
        title
      });

      if (!result.ok) {
        toast({
          title: "Unable to create page",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      const href = pageHref(orgSlug, result.pageSlug);
      const target = href.includes("?") ? `${href}&edit=1` : `${href}?edit=1`;

      toast({
        title: result.created ? "Page created" : "Page already exists",
        description: result.created ? "Opening editor." : "Opening existing page editor.",
        variant: "success"
      });

      setTitle("");
      setPageSlug("");
      setIsOpen(false);
      router.push(target);
      router.refresh();
    });
  }

  return (
    <>
      <Button className={triggerClassName} disabled={!canWrite} onClick={() => setIsOpen(true)} size={triggerSize} variant={triggerVariant}>
        <Plus className="h-4 w-4" />
        {triggerLabel}
      </Button>

      <Dialog onClose={closeDialog} open={isOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New page</DialogTitle>
            <DialogDescription>Set the page name and URL. The editor opens right after creation.</DialogDescription>
          </DialogHeader>

          <form className="space-y-3" onSubmit={handleCreate}>
            <FormField hint="Optional. Leave blank to auto-name from the URL." htmlFor={titleId} label="Page name">
              <Input
                disabled={!canWrite || isPending}
                id={titleId}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="About Us"
                value={title}
              />
            </FormField>
            <FormField hint="Use letters, numbers, and hyphens. Example: about-us" htmlFor={slugId} label="Page URL">
              <Input
                disabled={!canWrite || isPending}
                id={slugId}
                onChange={(event) => setPageSlug(event.target.value)}
                placeholder="about-us"
                required
                value={pageSlug}
              />
            </FormField>

            <DialogFooter>
              <Button disabled={isPending} onClick={closeDialog} type="button" variant="ghost">
                Cancel
              </Button>
              <Button disabled={!canWrite || isPending} type="submit">
                {isPending ? "Creating..." : "Create page"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
