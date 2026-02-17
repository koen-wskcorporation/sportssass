"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EditorSettingsDialog } from "@/components/shared/EditorSettingsDialog";
import { listBlockDefinitions } from "@/modules/site-builder/blocks/registry";
import type { OrgSiteBlockType } from "@/modules/site-builder/types";

type BlockLibraryDialogProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (type: OrgSiteBlockType) => void;
};

export function BlockLibraryDialog({ open, onClose, onSelect }: BlockLibraryDialogProps) {
  const blocks = listBlockDefinitions();

  return (
    <EditorSettingsDialog
      description="Select a section type to add to this page."
      footer={
        <Button onClick={onClose} size="sm" variant="ghost">
          Close
        </Button>
      }
      onClose={onClose}
      open={open}
      title="Add Block"
    >
      <div className="grid gap-3 md:grid-cols-2">
        {blocks.map((definition) => (
          <Card key={definition.type}>
            <CardHeader>
              <CardTitle className="text-base">{definition.displayName}</CardTitle>
              <CardDescription>Type: {definition.type}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => {
                  onSelect(definition.type);
                  onClose();
                }}
                size="sm"
                variant="secondary"
              >
                Add block
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </EditorSettingsDialog>
  );
}
