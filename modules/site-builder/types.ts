import type { ComponentType } from "react";
import type { LinkValue, SiteButton } from "@/lib/links";

export type OrgSiteBlockType = "hero" | "subhero" | "cta_grid" | "cta_card" | "schedule_preview";

export type HeroBlockConfig = {
  headline: string;
  subheadline: string;
  buttons: SiteButton[];
  backgroundImagePath: string | null;
  focalX: number;
  focalY: number;
  zoom: number;
};

export type SubheroBlockConfig = {
  headline: string;
  subheadline: string;
  buttons: SiteButton[];
};

export type CtaGridItem = {
  id: string;
  title: string;
  description: string;
  link: LinkValue;
};

export type CtaGridBlockConfig = {
  title: string;
  items: CtaGridItem[];
};

export type CtaCardBlockConfig = {
  heading: string;
  body: string;
  imagePath: string | null;
  focalX: number;
  focalY: number;
  zoom: number;
  accentHighlight: boolean;
  buttons: SiteButton[];
};

export type SchedulePreviewBlockConfig = {
  title: string;
  body: string;
  buttons: SiteButton[];
};

export type OrgSiteBlockConfigMap = {
  hero: HeroBlockConfig;
  subhero: SubheroBlockConfig;
  cta_grid: CtaGridBlockConfig;
  cta_card: CtaCardBlockConfig;
  schedule_preview: SchedulePreviewBlockConfig;
};

export type OrgPageBlock<TType extends OrgSiteBlockType = OrgSiteBlockType> = {
  id: string;
  type: TType;
  config: OrgSiteBlockConfigMap[TType];
};

export type OrgSitePage = {
  id: string;
  orgId: string;
  slug: string;
  title: string;
  isPublished: boolean;
  sortIndex: number;
  createdAt: string;
  updatedAt: string;
};

export type OrgManagePage = {
  id: string;
  slug: string;
  title: string;
  isPublished: boolean;
  sortIndex: number;
  createdAt: string;
  updatedAt: string;
};

export type OrgSitePageWithBlocks = {
  page: OrgSitePage;
  blocks: OrgPageBlock[];
};

export type BlockContext = {
  orgSlug: string;
  orgName: string;
  pageSlug: string;
};

export type OrgSiteRuntimeData = Record<string, never>;

export type BlockRenderProps<TType extends OrgSiteBlockType> = {
  block: OrgPageBlock<TType>;
  context: BlockContext;
  runtimeData: OrgSiteRuntimeData;
  isEditing: boolean;
};

export type BlockEditorProps<TType extends OrgSiteBlockType> = {
  block: OrgPageBlock<TType>;
  context: BlockContext;
  onChange: (block: OrgPageBlock<TType>) => void;
};

export type DraftBlockInput = {
  id?: string;
  type: string;
  config: unknown;
};

export type BlockDefinition<TType extends OrgSiteBlockType> = {
  type: TType;
  displayName: string;
  defaultConfig: (context: BlockContext) => OrgSiteBlockConfigMap[TType];
  sanitizeConfig: (config: unknown, context: BlockContext) => OrgSiteBlockConfigMap[TType];
  Render: ComponentType<BlockRenderProps<TType>>;
  Editor: ComponentType<BlockEditorProps<TType>>;
};
