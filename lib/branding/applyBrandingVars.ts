import type { CSSProperties } from "react";

type BrandingColorInput = {
  brandPrimary?: string | null;
  brandSecondary?: string | null;
};

function normalizeHex(value: string) {
  const trimmed = value.trim();
  const match = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(trimmed);

  if (!match) {
    return null;
  }

  const raw = match[1];

  if (raw.length === 3) {
    return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`.toLowerCase();
  }

  return `#${raw.toLowerCase()}`;
}

function hexToHslComponents(hex: string) {
  const normalized = normalizeHex(hex);

  if (!normalized) {
    return null;
  }

  const r = Number.parseInt(normalized.slice(1, 3), 16) / 255;
  const g = Number.parseInt(normalized.slice(3, 5), 16) / 255;
  const b = Number.parseInt(normalized.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;

  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }

    h = Math.round(h * 60);

    if (h < 0) {
      h += 360;
    }
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return `${h} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function applyBrandingVars({ brandPrimary, brandSecondary }: BrandingColorInput): CSSProperties {
  const styleVars: Record<string, string> = {};

  if (brandPrimary) {
    const primaryHsl = hexToHslComponents(brandPrimary);

    if (primaryHsl) {
      styleVars["--primary"] = primaryHsl;
      styleVars["--ring"] = primaryHsl;
    }
  }

  if (brandSecondary) {
    const secondaryHsl = hexToHslComponents(brandSecondary);

    if (secondaryHsl) {
      styleVars["--secondary"] = secondaryHsl;
    }
  }

  return styleVars as CSSProperties;
}

export function isValidHexColor(value: string) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}
