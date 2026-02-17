import { createId } from "@/modules/site-builder/blocks/helpers";
import {
  AnnouncementsBlockEditor,
  AnnouncementsBlockRender,
  createDefaultAnnouncementsConfig,
  sanitizeAnnouncementsConfig
} from "@/modules/site-builder/blocks/announcements";
import { CtaGridBlockEditor, CtaGridBlockRender, createDefaultCtaGridConfig, sanitizeCtaGridConfig } from "@/modules/site-builder/blocks/cta-grid";
import { CtaCardBlockEditor, CtaCardBlockRender, createDefaultCtaCardConfig, sanitizeCtaCardConfig } from "@/modules/site-builder/blocks/cta-card";
import { createDefaultHeroConfig, HeroBlockEditor, HeroBlockRender, sanitizeHeroConfig } from "@/modules/site-builder/blocks/hero";
import {
  createDefaultSchedulePreviewConfig,
  sanitizeSchedulePreviewConfig,
  SchedulePreviewBlockEditor,
  SchedulePreviewBlockRender
} from "@/modules/site-builder/blocks/schedule-preview";
import {
  createDefaultSponsorsCarouselConfig,
  sanitizeSponsorsCarouselConfig,
  SponsorsCarouselBlockEditor,
  SponsorsCarouselBlockRender
} from "@/modules/site-builder/blocks/sponsors-carousel";
import { createDefaultEmbedFormConfig, EmbedFormBlockEditor, EmbedFormBlockRender, sanitizeEmbedFormConfig } from "@/modules/site-builder/blocks/embed-form";
import type { BlockContext, BlockDefinition, DraftBlockInput, OrgPageBlock, OrgSiteBlockType } from "@/modules/site-builder/types";

type AnyBlockDefinition = {
  [K in OrgSiteBlockType]: BlockDefinition<K>;
};

const blockRegistry: AnyBlockDefinition = {
  hero: {
    type: "hero",
    displayName: "Hero",
    defaultConfig: createDefaultHeroConfig,
    sanitizeConfig: sanitizeHeroConfig,
    Render: HeroBlockRender,
    Editor: HeroBlockEditor
  },
  cta_grid: {
    type: "cta_grid",
    displayName: "Quick Links",
    defaultConfig: createDefaultCtaGridConfig,
    sanitizeConfig: sanitizeCtaGridConfig,
    Render: CtaGridBlockRender,
    Editor: CtaGridBlockEditor
  },
  announcements: {
    type: "announcements",
    displayName: "Announcements",
    defaultConfig: createDefaultAnnouncementsConfig,
    sanitizeConfig: sanitizeAnnouncementsConfig,
    Render: AnnouncementsBlockRender,
    Editor: AnnouncementsBlockEditor
  },
  cta_card: {
    type: "cta_card",
    displayName: "CTA Card",
    defaultConfig: createDefaultCtaCardConfig,
    sanitizeConfig: sanitizeCtaCardConfig,
    Render: CtaCardBlockRender,
    Editor: CtaCardBlockEditor
  },
  sponsors_carousel: {
    type: "sponsors_carousel",
    displayName: "Sponsors Carousel",
    defaultConfig: createDefaultSponsorsCarouselConfig,
    sanitizeConfig: sanitizeSponsorsCarouselConfig,
    Render: SponsorsCarouselBlockRender,
    Editor: SponsorsCarouselBlockEditor
  },
  schedule_preview: {
    type: "schedule_preview",
    displayName: "Schedule Preview",
    defaultConfig: createDefaultSchedulePreviewConfig,
    sanitizeConfig: sanitizeSchedulePreviewConfig,
    Render: SchedulePreviewBlockRender,
    Editor: SchedulePreviewBlockEditor
  },
  embed_form: {
    type: "embed_form",
    displayName: "Embedded Form",
    defaultConfig: createDefaultEmbedFormConfig,
    sanitizeConfig: sanitizeEmbedFormConfig,
    Render: EmbedFormBlockRender,
    Editor: EmbedFormBlockEditor
  }
};

export function isOrgSiteBlockType(value: string): value is OrgSiteBlockType {
  return value in blockRegistry;
}

export function getBlockDefinition<TType extends OrgSiteBlockType>(type: TType): BlockDefinition<TType> {
  return blockRegistry[type] as BlockDefinition<TType>;
}

export function listBlockDefinitions() {
  return Object.values(blockRegistry);
}

export function createDefaultBlock<TType extends OrgSiteBlockType>(type: TType, context: BlockContext, id = createId()): OrgPageBlock<TType> {
  const definition = getBlockDefinition(type);

  return {
    id,
    type,
    config: definition.defaultConfig(context)
  };
}

export function createDefaultBlocksForPage(pageSlug: string, context: BlockContext): OrgPageBlock[] {
  if (pageSlug === "home") {
    return [
      createDefaultBlock("hero", context),
      createDefaultBlock("cta_grid", context),
      createDefaultBlock("announcements", context),
      createDefaultBlock("cta_card", context),
      createDefaultBlock("sponsors_carousel", context),
      createDefaultBlock("schedule_preview", context)
    ];
  }

  return [createDefaultBlock("hero", context), createDefaultBlock("announcements", context), createDefaultBlock("cta_card", context)];
}

function normalizeSingleBlock(block: DraftBlockInput, context: BlockContext): OrgPageBlock | null {
  const normalizedType = block.type === "sponsors_preview" ? "cta_card" : block.type;

  if (!isOrgSiteBlockType(normalizedType)) {
    return null;
  }

  const definition = getBlockDefinition(normalizedType);

  return {
    id: typeof block.id === "string" && block.id.trim().length > 0 ? block.id : createId(),
    type: normalizedType,
    config: definition.sanitizeConfig(block.config, context)
  };
}

export function normalizeDraftBlocks(blocks: DraftBlockInput[], context: BlockContext): OrgPageBlock[] {
  const normalized = blocks
    .map((block) => normalizeSingleBlock(block, context))
    .filter((block): block is OrgPageBlock => Boolean(block));

  if (normalized.length === 0) {
    return createDefaultBlocksForPage(context.pageSlug, context);
  }

  return normalized;
}

export function normalizeRowBlocks(
  rows: Array<{
    id: string;
    type: string;
    config: unknown;
    sort_index?: number | null;
  }>,
  context: BlockContext
): OrgPageBlock[] {
  const normalized = rows
    .slice()
    .sort((a, b) => (a.sort_index ?? 0) - (b.sort_index ?? 0))
    .map((row) => {
      return normalizeSingleBlock(
        {
          id: row.id,
          type: row.type,
          config: row.config
        },
        context
      );
    })
    .filter((block): block is OrgPageBlock => Boolean(block));

  if (normalized.length === 0) {
    return createDefaultBlocksForPage(context.pageSlug, context);
  }

  return normalized;
}
