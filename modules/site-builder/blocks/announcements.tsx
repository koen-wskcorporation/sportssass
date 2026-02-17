import { buttonVariants } from "@/components/ui/button";
import { ButtonListEditor } from "@/components/editor/buttons/ButtonListEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { asButtons, asNumber, asObject, asOptionalButton, asText } from "@/modules/site-builder/blocks/helpers";
import type { AnnouncementsBlockConfig, BlockContext, BlockEditorProps, BlockRenderProps } from "@/modules/site-builder/types";
import { cn } from "@/lib/utils";
import { resolveButtonHref } from "@/lib/links";

function defaultAnnouncementsConfig(): AnnouncementsBlockConfig {
  return {
    title: "Announcements",
    maxItems: 4,
    viewAllButton: null
  };
}

export function createDefaultAnnouncementsConfig(_: BlockContext) {
  return defaultAnnouncementsConfig();
}

export function sanitizeAnnouncementsConfig(config: unknown): AnnouncementsBlockConfig {
  const fallback = defaultAnnouncementsConfig();
  const value = asObject(config);

  const migratedMaxItems = Array.isArray(value.items) ? (value.items as unknown[]).length || fallback.maxItems : fallback.maxItems;

  const migratedViewAllButton =
    asOptionalButton(value.viewAllButton) ??
    (Array.isArray(value.viewAllButton)
      ? asButtons(value.viewAllButton, [], { max: 1 })[0] ?? null
      : null);

  return {
    title: asText(value.title, fallback.title, 120),
    maxItems: asNumber(value.maxItems, migratedMaxItems, 1, 12),
    viewAllButton: migratedViewAllButton
  };
}

function formatPublishDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

export function AnnouncementsBlockRender({ block, context, runtimeData, isEditing }: BlockRenderProps<"announcements">) {
  const announcements = runtimeData.announcements.slice(0, block.config.maxItems);

  if (announcements.length === 0 && !isEditing) {
    return null;
  }

  return (
    <section className="space-y-4" id="announcements">
      <h2 className="text-2xl font-semibold text-text">{block.config.title}</h2>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-text-muted">No published announcements yet.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {announcements.map((item) => {
            const publishDate = formatPublishDate(item.publishAt);

            return (
              <Card key={item.id}>
                <CardHeader>
                  {publishDate ? <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{publishDate}</p> : null}
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-text-muted">{item.summary}</p>
                  {item.button ? (
                    <a
                      className={cn(buttonVariants({ size: "sm", variant: item.button.variant }))}
                      href={resolveButtonHref(context.orgSlug, item.button.href)}
                      rel={item.button.newTab ? "noreferrer" : undefined}
                      target={item.button.newTab ? "_blank" : undefined}
                    >
                      {item.button.label}
                    </a>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {block.config.viewAllButton ? (
        <div>
          <a
            className={buttonVariants({ variant: block.config.viewAllButton.variant })}
            href={resolveButtonHref(context.orgSlug, block.config.viewAllButton.href)}
            rel={block.config.viewAllButton.newTab ? "noreferrer" : undefined}
            target={block.config.viewAllButton.newTab ? "_blank" : undefined}
          >
            {block.config.viewAllButton.label}
          </a>
        </div>
      ) : null}
    </section>
  );
}

export function AnnouncementsBlockEditor({ block, onChange, context }: BlockEditorProps<"announcements">) {
  function updateConfig(patch: Partial<AnnouncementsBlockConfig>) {
    onChange({
      ...block,
      config: {
        ...block.config,
        ...patch
      }
    });
  }

  return (
    <div className="space-y-4">
      <FormField label="Section title">
        <Input
          onChange={(event) => {
            updateConfig({ title: event.target.value });
          }}
          value={block.config.title}
        />
      </FormField>

      <FormField hint="How many published announcements to show" label="Max items">
        <Input
          max={12}
          min={1}
          onChange={(event) => {
            updateConfig({
              maxItems: asNumber(event.target.value, block.config.maxItems, 1, 12)
            });
          }}
          type="number"
          value={block.config.maxItems}
        />
      </FormField>

      <ButtonListEditor
        addButtonLabel="Add button"
        emptyStateText="No buttons yet."
        maxButtons={1}
        onChange={(buttons) => {
          updateConfig({
            viewAllButton: buttons[0] ?? null
          });
        }}
        orgSlug={context.orgSlug}
        title="View all announcements button"
        value={block.config.viewAllButton ? [block.config.viewAllButton] : []}
      />

      <p className="text-xs text-text-muted">Manage announcement content from the Announcements page in Tools.</p>
    </div>
  );
}
