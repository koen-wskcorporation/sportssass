import type { SiteBlockConfigMap, SiteBlockType, SitePageBlock, SitePageContext, SitePageLayout } from "@/modules/site-builder/types";

type SitePageDefinition = {
  label: string;
  resolvePath: (orgSlug: string) => string;
  allowedBlocks: SiteBlockType[];
};

const editablePageRegistry = {
  home: {
    label: "Home",
    resolvePath: (orgSlug: string) => `/${orgSlug}`,
    allowedBlocks: ["hero", "rich_text", "sponsors_grid", "cta_button"]
  }
} as const satisfies Record<string, SitePageDefinition>;

export type SitePageKey = keyof typeof editablePageRegistry;

type BlockDefinition<TType extends SiteBlockType> = {
  label: string;
  createDefaultConfig: (context: SitePageContext) => SiteBlockConfigMap[TType];
  sanitizeConfig: (config: unknown, context: SitePageContext) => SiteBlockConfigMap[TType];
};

function createBlockId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function asText(value: unknown, fallback: string, maxLength = 280) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  return trimmed.slice(0, maxLength);
}

function asBody(value: unknown, fallback: string, maxLength = 2500) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  return trimmed.slice(0, maxLength);
}

function asUrl(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  if (trimmed.startsWith("/") || trimmed.startsWith("#") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return fallback;
}

const blockRegistry: Record<SiteBlockType, BlockDefinition<SiteBlockType>> = {
  hero: {
    label: "Hero",
    createDefaultConfig: (context) => ({
      tagline: `Building confidence, teamwork, and community through youth sports at ${context.orgName}.`,
      primaryCtaLabel: "Become a Sponsor",
      primaryCtaHref: `/${context.orgSlug}/sponsors`
    }),
    sanitizeConfig: (config, context) => {
      const next = typeof config === "object" && config ? (config as Record<string, unknown>) : {};

      return {
        tagline: asText(
          next.tagline,
          `Building confidence, teamwork, and community through youth sports at ${context.orgName}.`,
          280
        ),
        primaryCtaLabel: asText(next.primaryCtaLabel, "Become a Sponsor", 60),
        primaryCtaHref: asUrl(next.primaryCtaHref, `/${context.orgSlug}/sponsors`)
      };
    }
  },
  rich_text: {
    label: "Rich Text",
    createDefaultConfig: (context) => ({
      title: `About ${context.orgName}`,
      body:
        `${context.orgName} creates a positive space where young athletes can learn, compete, and grow. ` +
        "Every season focuses on mentorship, teamwork, and character development."
    }),
    sanitizeConfig: (config, context) => {
      const next = typeof config === "object" && config ? (config as Record<string, unknown>) : {};

      return {
        title: asText(next.title, `About ${context.orgName}`, 120),
        body: asBody(
          next.body,
          `${context.orgName} creates a positive space where young athletes can learn, compete, and grow.`
        )
      };
    }
  },
  sponsors_grid: {
    label: "Sponsors Grid",
    createDefaultConfig: (context) => ({
      title: "Support the Season",
      description:
        "Interested in sponsoring? Help fund equipment, facilities, and opportunities for athletes in our program.",
      ctaLabel: "Become a Sponsor",
      ctaHref: `/${context.orgSlug}/sponsors`
    }),
    sanitizeConfig: (config, context) => {
      const next = typeof config === "object" && config ? (config as Record<string, unknown>) : {};

      return {
        title: asText(next.title, "Support the Season", 120),
        description: asBody(
          next.description,
          "Interested in sponsoring? Help fund equipment, facilities, and opportunities for athletes in our program."
        ),
        ctaLabel: asText(next.ctaLabel, "Become a Sponsor", 60),
        ctaHref: asUrl(next.ctaHref, `/${context.orgSlug}/sponsors`)
      };
    }
  },
  cta_button: {
    label: "CTA Button",
    createDefaultConfig: (context) => ({
      title: "Partner With Us",
      body: "Join our community of supporters and help deliver impactful youth sports programs.",
      buttonLabel: "Partner With Us",
      buttonHref: `/${context.orgSlug}/sponsors`
    }),
    sanitizeConfig: (config, context) => {
      const next = typeof config === "object" && config ? (config as Record<string, unknown>) : {};

      return {
        title: asText(next.title, "Partner With Us", 120),
        body: asBody(next.body, "Join our community of supporters and help deliver impactful youth sports programs."),
        buttonLabel: asText(next.buttonLabel, "Partner With Us", 60),
        buttonHref: asUrl(next.buttonHref, `/${context.orgSlug}/sponsors`)
      };
    }
  }
};

export function getEditablePageDefinition(pageKey: SitePageKey) {
  return editablePageRegistry[pageKey];
}

export function getEditablePageKeys() {
  return Object.keys(editablePageRegistry) as SitePageKey[];
}

export function getEditablePageForPathname(pathname: string, orgSlug: string): SitePageKey | null {
  const normalizedPath = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;

  for (const key of getEditablePageKeys()) {
    const definition = editablePageRegistry[key];
    const path = definition.resolvePath(orgSlug);

    if (path === normalizedPath) {
      return key;
    }
  }

  return null;
}

export function getEditablePageHref(orgSlug: string, pageKey: SitePageKey, editMode: boolean) {
  const basePath = editablePageRegistry[pageKey].resolvePath(orgSlug);
  return editMode ? `${basePath}?edit=1` : basePath;
}

export function getAllowedBlocksForPage(pageKey: SitePageKey) {
  return editablePageRegistry[pageKey].allowedBlocks;
}

export function getBlockDefinition(type: SiteBlockType) {
  return blockRegistry[type];
}

export function createDefaultBlock(type: SiteBlockType, context: SitePageContext): SitePageBlock {
  const definition = blockRegistry[type] as BlockDefinition<typeof type>;

  return {
    id: createBlockId(),
    type,
    config: definition.createDefaultConfig(context)
  } as SitePageBlock;
}

function sanitizeSingleBlock(block: unknown, pageKey: SitePageKey, context: SitePageContext): SitePageBlock | null {
  if (!block || typeof block !== "object") {
    return null;
  }

  const raw = block as Partial<SitePageBlock> & { config?: unknown };
  const type = raw.type;
  const id = raw.id;

  if (typeof type !== "string" || !getAllowedBlocksForPage(pageKey).includes(type as SiteBlockType)) {
    return null;
  }

  const definition = blockRegistry[type as SiteBlockType] as BlockDefinition<typeof type>;
  const safeId = typeof id === "string" && id.trim() ? id : createBlockId();

  return {
    id: safeId,
    type,
    config: definition.sanitizeConfig(raw.config, context)
  } as SitePageBlock;
}

export function createDefaultLayout(pageKey: SitePageKey, context: SitePageContext): SitePageLayout {
  if (pageKey === "home") {
    return [
      createDefaultBlock("hero", context),
      createDefaultBlock("rich_text", context),
      createDefaultBlock("sponsors_grid", context),
      createDefaultBlock("cta_button", context)
    ];
  }

  return [createDefaultBlock("rich_text", context)];
}

export function normalizeSitePageLayout(pageKey: SitePageKey, layout: unknown, context: SitePageContext): SitePageLayout {
  if (!Array.isArray(layout)) {
    return createDefaultLayout(pageKey, context);
  }

  const normalized = layout
    .map((block) => sanitizeSingleBlock(block, pageKey, context))
    .filter((block): block is SitePageBlock => Boolean(block));

  if (!normalized.length) {
    return createDefaultLayout(pageKey, context);
  }

  return normalized;
}
