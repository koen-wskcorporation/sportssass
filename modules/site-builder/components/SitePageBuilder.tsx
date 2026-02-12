"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { GripVertical, Plus, Save, Trash2, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { publishSitePageAction } from "@/modules/site-builder/actions";
import {
  createDefaultBlock,
  getAllowedBlocksForPage,
  getBlockDefinition,
  getEditablePageDefinition,
  getEditablePageHref,
  type SitePageKey
} from "@/modules/site-builder/registry";
import type { SitePageBlock, SitePageLayout } from "@/modules/site-builder/types";

type SitePageBuilderProps = {
  orgSlug: string;
  orgName: string;
  orgLogoUrl: string | null;
  pageKey: SitePageKey;
  initialLayout: SitePageLayout;
  canEdit: boolean;
  initialEditMode: boolean;
};

function getOrgInitial(orgName: string) {
  return orgName.trim().charAt(0).toUpperCase() || "O";
}

function reorderBlocks(blocks: SitePageLayout, draggedId: string, targetId: string) {
  const fromIndex = blocks.findIndex((block) => block.id === draggedId);
  const toIndex = blocks.findIndex((block) => block.id === targetId);

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return blocks;
  }

  const next = [...blocks];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);

  return next;
}

export function SitePageBuilder({
  orgSlug,
  orgName,
  orgLogoUrl,
  pageKey,
  initialLayout,
  canEdit,
  initialEditMode
}: SitePageBuilderProps) {
  const pageDefinition = getEditablePageDefinition(pageKey);
  const allowedBlocks = getAllowedBlocksForPage(pageKey);
  const [isEditing, setIsEditing] = useState(initialEditMode && canEdit);
  const [publishedLayout, setPublishedLayout] = useState(initialLayout);
  const [draftLayout, setDraftLayout] = useState(initialLayout);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [openInsertIndex, setOpenInsertIndex] = useState<number | null>(null);
  const [isSaving, startSaving] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const canSave = useMemo(() => {
    return JSON.stringify(draftLayout) !== JSON.stringify(publishedLayout);
  }, [draftLayout, publishedLayout]);

  const pageHref = getEditablePageHref(orgSlug, pageKey, false);

  function updateBlock(nextBlock: SitePageBlock) {
    setDraftLayout((current) => current.map((block) => (block.id === nextBlock.id ? nextBlock : block)));
  }

  function removeBlock(blockId: string) {
    setDraftLayout((current) => current.filter((block) => block.id !== blockId));
  }

  function addBlock(blockType: SitePageBlock["type"], index: number) {
    setDraftLayout((current) => {
      const nextBlock = createDefaultBlock(blockType, {
        orgName,
        orgSlug
      });

      return [...current.slice(0, index), nextBlock, ...current.slice(index)];
    });
    setOpenInsertIndex(null);
  }

  function cancelEditing() {
    setDraftLayout(publishedLayout);
    setIsEditing(false);
    setOpenInsertIndex(null);
    router.replace(pageHref);
  }

  function saveAndPublish() {
    startSaving(async () => {
      const result = await publishSitePageAction({
        orgSlug,
        pageKey,
        layout: draftLayout
      });

      if (!result.ok) {
        toast({
          title: "Publish failed",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      setPublishedLayout(result.layout);
      setDraftLayout(result.layout);
      setIsEditing(false);
      setOpenInsertIndex(null);
      router.replace(pathname);

      toast({
        title: "Page published",
        description: `${pageDefinition.label} has been updated.`,
        variant: "success"
      });
    });
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-10">
      <div className="space-y-5 md:space-y-6">
        {isEditing ? (
          <div className="sticky top-2 z-40 rounded-xl border bg-surface/95 px-4 py-3 backdrop-blur">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm font-semibold">Editing: {pageDefinition.label}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button disabled={!canSave || isSaving} onClick={saveAndPublish} size="sm">
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Publishing..." : "Save & Publish"}
                </Button>
                <Button onClick={cancelEditing} size="sm" variant="ghost">
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {isEditing ? <InsertSectionRow index={0} onAdd={addBlock} onToggle={setOpenInsertIndex} openIndex={openInsertIndex} pageKey={pageKey} /> : null}

        {draftLayout.map((block, index) => (
          <div
            className={cn("rounded-2xl", isEditing && "border border-dashed border-border/60 p-2 transition-colors hover:border-primary/70")}
            key={block.id}
            onDragOver={
              isEditing
                ? (event) => {
                    event.preventDefault();
                  }
                : undefined
            }
            onDrop={
              isEditing
                ? (event) => {
                    event.preventDefault();

                    if (!draggingBlockId || draggingBlockId === block.id) {
                      return;
                    }

                    setDraftLayout((current) => reorderBlocks(current, draggingBlockId, block.id));
                    setDraggingBlockId(null);
                  }
                : undefined
            }
          >
            {isEditing ? (
              <div className="mb-3 flex items-center justify-between rounded-lg border bg-surface-alt px-3 py-2">
                <div className="flex items-center gap-2">
                  <Button
                    draggable
                    onDragEnd={() => setDraggingBlockId(null)}
                    onDragStart={() => setDraggingBlockId(block.id)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <GripVertical className="h-4 w-4" />
                  </Button>
                  <p className="text-sm font-semibold">{getBlockDefinition(block.type).label}</p>
                </div>
                <Button onClick={() => removeBlock(block.id)} size="sm" type="button" variant="ghost">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              </div>
            ) : null}

            <SitePageBlockView block={block} orgLogoUrl={orgLogoUrl} orgName={orgName} orgSlug={orgSlug} />

            {isEditing ? <SitePageBlockEditor block={block} onChange={updateBlock} /> : null}
            {isEditing ? (
              <InsertSectionRow
                index={index + 1}
                onAdd={addBlock}
                onToggle={setOpenInsertIndex}
                openIndex={openInsertIndex}
                pageKey={pageKey}
              />
            ) : null}
          </div>
        ))}

        {!draftLayout.length ? (
          <Card>
            <CardHeader>
              <CardTitle>No sections yet</CardTitle>
              <CardDescription>Add a section to start building this page.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {allowedBlocks.map((blockType) => (
                  <Button key={blockType} onClick={() => addBlock(blockType, 0)} size="sm" type="button" variant="secondary">
                    <Plus className="mr-2 h-4 w-4" />
                    {getBlockDefinition(blockType).label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {canEdit && !isEditing ? (
          <div className="hidden">
            <Link className={buttonVariants({ size: "sm" })} href={getEditablePageHref(orgSlug, pageKey, true)}>
              Edit page
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function InsertSectionRow({
  pageKey,
  index,
  openIndex,
  onToggle,
  onAdd
}: {
  pageKey: SitePageKey;
  index: number;
  openIndex: number | null;
  onToggle: (index: number | null) => void;
  onAdd: (blockType: SitePageBlock["type"], index: number) => void;
}) {
  const isOpen = openIndex === index;
  const allowedBlocks = getAllowedBlocksForPage(pageKey);

  return (
    <div className="my-3">
      <div className="flex justify-center">
        <Button onClick={() => onToggle(isOpen ? null : index)} size="sm" type="button" variant="ghost">
          <Plus className="mr-2 h-4 w-4" />
          Add section
        </Button>
      </div>
      {isOpen ? (
        <Card className="mt-2">
          <CardHeader>
            <CardTitle className="text-base">Choose section type</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {allowedBlocks.map((blockType) => (
              <Button key={blockType} onClick={() => onAdd(blockType, index)} size="sm" type="button" variant="secondary">
                {getBlockDefinition(blockType).label}
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function SitePageBlockView({
  block,
  orgName,
  orgSlug,
  orgLogoUrl
}: {
  block: SitePageBlock;
  orgName: string;
  orgSlug: string;
  orgLogoUrl: string | null;
}) {
  if (block.type === "hero") {
    return (
      <section className="relative overflow-hidden rounded-2xl border bg-surface px-6 py-12 shadow-sm sm:px-10 md:py-16">
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 -bottom-20 h-72 w-72 rounded-full bg-secondary/15 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[auto_1fr] lg:items-center">
          <div className="flex h-32 w-32 items-center justify-center rounded-2xl border bg-surface-alt p-4">
            {orgLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={`${orgName} logo`} className="h-full w-full object-contain" src={orgLogoUrl} />
            ) : (
              <span className="font-display text-4xl font-bold text-foreground">{getOrgInitial(orgName)}</span>
            )}
          </div>

          <div className="space-y-5">
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">{orgName}</h1>
            <p className="max-w-3xl text-base text-muted-foreground md:text-lg">{block.config.tagline}</p>
            <Link className={buttonVariants({ size: "lg", variant: "primary" })} href={block.config.primaryCtaHref}>
              {block.config.primaryCtaLabel}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (block.type === "rich_text") {
    return (
      <section className="rounded-2xl border bg-surface p-6 shadow-sm md:p-8">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">{block.config.title}</h2>
        <p className="mt-3 whitespace-pre-line text-muted-foreground">{block.config.body}</p>
      </section>
    );
  }

  if (block.type === "sponsors_grid") {
    return (
      <section className="rounded-2xl border bg-surface-alt p-6 shadow-sm md:p-8">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">{block.config.title}</h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">{block.config.description}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="rounded-lg border border-dashed bg-surface p-4 text-center text-xs text-muted-foreground" key={index}>
              Sponsor Logo
            </div>
          ))}
        </div>
        <div className="mt-6">
          <Link className={buttonVariants({ variant: "secondary" })} href={block.config.ctaHref}>
            {block.config.ctaLabel}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border bg-surface px-6 py-8 shadow-sm sm:px-10 sm:py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">{block.config.title}</h2>
          <p className="max-w-2xl text-muted-foreground">{block.config.body}</p>
        </div>
        <Link className={cn(buttonVariants({ size: "lg", variant: "primary" }), "w-full md:w-auto")} href={block.config.buttonHref}>
          {block.config.buttonLabel}
        </Link>
      </div>
    </section>
  );
}

function SitePageBlockEditor({
  block,
  onChange
}: {
  block: SitePageBlock;
  onChange: (block: SitePageBlock) => void;
}) {
  if (block.type === "hero") {
    return (
      <Card className="mt-3">
        <CardHeader>
          <CardTitle className="text-base">Hero Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <FormField label="Tagline">
            <Textarea
              onChange={(event) =>
                onChange({
                  ...block,
                  config: {
                    ...block.config,
                    tagline: event.target.value
                  }
                })
              }
              value={block.config.tagline}
            />
          </FormField>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Primary CTA Label">
              <Input
                onChange={(event) =>
                  onChange({
                    ...block,
                    config: {
                      ...block.config,
                      primaryCtaLabel: event.target.value
                    }
                  })
                }
                value={block.config.primaryCtaLabel}
              />
            </FormField>
            <FormField label="Primary CTA Link">
              <Input
                onChange={(event) =>
                  onChange({
                    ...block,
                    config: {
                      ...block.config,
                      primaryCtaHref: event.target.value
                    }
                  })
                }
                value={block.config.primaryCtaHref}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (block.type === "rich_text") {
    return (
      <Card className="mt-3">
        <CardHeader>
          <CardTitle className="text-base">Rich Text Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <FormField label="Title">
            <Input
              onChange={(event) =>
                onChange({
                  ...block,
                  config: {
                    ...block.config,
                    title: event.target.value
                  }
                })
              }
              value={block.config.title}
            />
          </FormField>
          <FormField label="Body">
            <Textarea
              onChange={(event) =>
                onChange({
                  ...block,
                  config: {
                    ...block.config,
                    body: event.target.value
                  }
                })
              }
              value={block.config.body}
            />
          </FormField>
        </CardContent>
      </Card>
    );
  }

  if (block.type === "sponsors_grid") {
    return (
      <Card className="mt-3">
        <CardHeader>
          <CardTitle className="text-base">Sponsors Grid Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <FormField label="Title">
            <Input
              onChange={(event) =>
                onChange({
                  ...block,
                  config: {
                    ...block.config,
                    title: event.target.value
                  }
                })
              }
              value={block.config.title}
            />
          </FormField>
          <FormField label="Description">
            <Textarea
              onChange={(event) =>
                onChange({
                  ...block,
                  config: {
                    ...block.config,
                    description: event.target.value
                  }
                })
              }
              value={block.config.description}
            />
          </FormField>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="CTA Label">
              <Input
                onChange={(event) =>
                  onChange({
                    ...block,
                    config: {
                      ...block.config,
                      ctaLabel: event.target.value
                    }
                  })
                }
                value={block.config.ctaLabel}
              />
            </FormField>
            <FormField label="CTA Link">
              <Input
                onChange={(event) =>
                  onChange({
                    ...block,
                    config: {
                      ...block.config,
                      ctaHref: event.target.value
                    }
                  })
                }
                value={block.config.ctaHref}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-3">
      <CardHeader>
        <CardTitle className="text-base">CTA Section Settings</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <FormField label="Title">
          <Input
            onChange={(event) =>
              onChange({
                ...block,
                config: {
                  ...block.config,
                  title: event.target.value
                }
              })
            }
            value={block.config.title}
          />
        </FormField>
        <FormField label="Body">
          <Textarea
            onChange={(event) =>
              onChange({
                ...block,
                config: {
                  ...block.config,
                  body: event.target.value
                }
              })
            }
            value={block.config.body}
          />
        </FormField>
        <div className="grid gap-3 md:grid-cols-2">
          <FormField label="Button Label">
            <Input
              onChange={(event) =>
                onChange({
                  ...block,
                  config: {
                    ...block.config,
                    buttonLabel: event.target.value
                  }
                })
              }
              value={block.config.buttonLabel}
            />
          </FormField>
          <FormField label="Button Link">
            <Input
              onChange={(event) =>
                onChange({
                  ...block,
                  config: {
                    ...block.config,
                    buttonHref: event.target.value
                  }
                })
              }
              value={block.config.buttonHref}
            />
          </FormField>
        </div>
      </CardContent>
    </Card>
  );
}
