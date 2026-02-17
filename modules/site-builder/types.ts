import type { ComponentType } from "react";
import type { LinkValue, SiteButton } from "@/lib/links";
import type { PublishedFormRuntime } from "@/modules/forms/types";

export type OrgSiteBlockType = "hero" | "cta_grid" | "announcements" | "cta_card" | "sponsors_carousel" | "schedule_preview" | "embed_form";

export type HeroBlockConfig = {
  headline: string;
  subheadline: string;
  buttons: SiteButton[];
  backgroundImagePath: string | null;
  focalX: number;
  focalY: number;
  zoom: number;
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

export type PublishedAnnouncementItem = {
  id: string;
  title: string;
  summary: string;
  publishAt: string | null;
  button: SiteButton | null;
};

export type AnnouncementsBlockConfig = {
  title: string;
  maxItems: number;
  viewAllButton: SiteButton | null;
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

export type SponsorsCarouselBlockConfig = {
  title: string;
};

export type SchedulePreviewBlockConfig = {
  title: string;
  body: string;
  buttons: SiteButton[];
};

export type EmbedFormBlockConfig = {
  formId: string | null;
  variant: "inline" | "modal";
  titleOverride: string | null;
  successMessageOverride: string | null;
};

export type OrgSiteBlockConfigMap = {
  hero: HeroBlockConfig;
  cta_grid: CtaGridBlockConfig;
  announcements: AnnouncementsBlockConfig;
  cta_card: CtaCardBlockConfig;
  sponsors_carousel: SponsorsCarouselBlockConfig;
  schedule_preview: SchedulePreviewBlockConfig;
  embed_form: EmbedFormBlockConfig;
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

export type PublishedSponsorLogo = {
  id: string;
  companyName: string;
  logoUrl: string;
};

export type OrgSiteRuntimeData = {
  announcements: PublishedAnnouncementItem[];
  sponsorLogos: PublishedSponsorLogo[];
  publishedForms: PublishedFormRuntime[];
};

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
