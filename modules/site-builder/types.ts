export type SiteBlockType = "hero" | "rich_text" | "sponsors_grid" | "cta_button";

export type HeroBlockConfig = {
  tagline: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
};

export type RichTextBlockConfig = {
  title: string;
  body: string;
};

export type SponsorsGridBlockConfig = {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
};

export type CtaButtonBlockConfig = {
  title: string;
  body: string;
  buttonLabel: string;
  buttonHref: string;
};

export type SiteBlockConfigMap = {
  hero: HeroBlockConfig;
  rich_text: RichTextBlockConfig;
  sponsors_grid: SponsorsGridBlockConfig;
  cta_button: CtaButtonBlockConfig;
};

type SiteBlockBase<TType extends SiteBlockType> = {
  id: string;
  type: TType;
  config: SiteBlockConfigMap[TType];
};

export type HeroBlock = SiteBlockBase<"hero">;
export type RichTextBlock = SiteBlockBase<"rich_text">;
export type SponsorsGridBlock = SiteBlockBase<"sponsors_grid">;
export type CtaButtonBlock = SiteBlockBase<"cta_button">;

export type SitePageBlock = HeroBlock | RichTextBlock | SponsorsGridBlock | CtaButtonBlock;
export type SitePageLayout = SitePageBlock[];

export type SitePageContext = {
  orgSlug: string;
  orgName: string;
};
