"use client";

import { useEffect } from "react";
import { applyBrandingVars } from "@/lib/branding/applyBrandingVars";

type BrandingCssVarsBridgeProps = {
  accent?: string | null;
};

export function BrandingCssVarsBridge({ accent }: BrandingCssVarsBridgeProps) {
  useEffect(() => {
    const rootStyle = document.documentElement.style;
    const vars = applyBrandingVars({ accent }) as Record<string, string>;
    const keys = Object.keys(vars);
    const previousValues = new Map<string, string>();

    for (const key of keys) {
      previousValues.set(key, rootStyle.getPropertyValue(key));
      rootStyle.setProperty(key, vars[key]);
    }

    return () => {
      for (const key of keys) {
        const previousValue = previousValues.get(key) ?? "";

        if (previousValue) {
          rootStyle.setProperty(key, previousValue);
        } else {
          rootStyle.removeProperty(key);
        }
      }
    };
  }, [accent]);

  return null;
}
