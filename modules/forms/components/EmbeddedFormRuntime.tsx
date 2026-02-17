"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PublicFormRenderer } from "@/modules/forms/components/PublicFormRenderer";
import type { PublishedFormRuntime } from "@/modules/forms/types";

type EmbeddedFormRuntimeProps = {
  orgSlug: string;
  form: PublishedFormRuntime;
  variant: "inline" | "modal";
  titleOverride?: string;
  successMessageOverride?: string;
};

export function EmbeddedFormRuntime({ orgSlug, form, variant, titleOverride, successMessageOverride }: EmbeddedFormRuntimeProps) {
  const [open, setOpen] = useState(false);

  if (variant === "inline") {
    return (
      <PublicFormRenderer
        form={form}
        orgSlug={orgSlug}
        successMessageOverride={successMessageOverride}
        titleOverride={titleOverride}
      />
    );
  }

  return (
    <div className="space-y-3">
      <Button onClick={() => setOpen(true)} type="button" variant="secondary">
        {titleOverride?.trim() || form.name}
      </Button>

      <Dialog
        onClose={() => {
          setOpen(false);
        }}
        open={open}
      >
        <DialogContent className="w-[min(92vw,760px)] p-0" style={{ width: "min(92vw,760px)", maxWidth: "92vw" }}>
          <div className="max-h-[84vh] overflow-y-auto p-5 md:p-6">
            <DialogHeader>
              <DialogTitle>{titleOverride?.trim() || form.name}</DialogTitle>
            </DialogHeader>
            <PublicFormRenderer
              form={form}
              hideTitle
              orgSlug={orgSlug}
              successMessageOverride={successMessageOverride}
              titleOverride={titleOverride}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
