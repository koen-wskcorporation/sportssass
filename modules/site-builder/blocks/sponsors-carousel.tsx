import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { asObject, asText } from "@/modules/site-builder/blocks/helpers";
import type { BlockContext, BlockEditorProps, BlockRenderProps, SponsorsCarouselBlockConfig } from "@/modules/site-builder/types";

function defaultSponsorsCarouselConfig(_: BlockContext): SponsorsCarouselBlockConfig {
  return {
    title: "Our Sponsors"
  };
}

export function createDefaultSponsorsCarouselConfig(context: BlockContext) {
  return defaultSponsorsCarouselConfig(context);
}

export function sanitizeSponsorsCarouselConfig(config: unknown, context: BlockContext): SponsorsCarouselBlockConfig {
  const fallback = defaultSponsorsCarouselConfig(context);
  const value = asObject(config);

  return {
    title: asText(value.title, fallback.title, 120)
  };
}

export function SponsorsCarouselBlockRender({ block, runtimeData, isEditing }: BlockRenderProps<"sponsors_carousel">) {
  const logos = runtimeData.sponsorLogos;

  if (logos.length === 0) {
    if (!isEditing) {
      return null;
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{block.config.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-muted">No published sponsor logos available yet.</p>
        </CardContent>
      </Card>
    );
  }

  const loopItems = [...logos, ...logos];

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold text-text">{block.config.title}</h2>
      <div className="overflow-hidden rounded-card border bg-surface py-4">
        <div className="site-sponsors-marquee flex w-max items-center gap-8 px-4">
          {loopItems.map((item, index) => (
            <div className="flex h-16 w-[160px] shrink-0 items-center justify-center" key={`${item.id}-${index}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={item.companyName} className="max-h-14 w-full object-contain" src={item.logoUrl} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SponsorsCarouselBlockEditor({ block, onChange }: BlockEditorProps<"sponsors_carousel">) {
  return (
    <div className="space-y-4">
      <FormField label="Title">
        <Input
          onChange={(event) => {
            onChange({
              ...block,
              config: {
                ...block.config,
                title: event.target.value
              }
            });
          }}
          value={block.config.title}
        />
      </FormField>
      <p className="text-xs text-text-muted">This block automatically shows sponsors marked as published.</p>
    </div>
  );
}
