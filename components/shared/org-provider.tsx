"use client";

import { createContext, useContext } from "react";
import type { ResolvedOrgContext } from "@/lib/tenancy/types";

const OrgContext = createContext<ResolvedOrgContext | null>(null);

export function OrgProvider({ value, children }: { value: ResolvedOrgContext; children: React.ReactNode }) {
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const context = useContext(OrgContext);

  if (!context) {
    throw new Error("useOrg must be used within OrgProvider.");
  }

  return context;
}
