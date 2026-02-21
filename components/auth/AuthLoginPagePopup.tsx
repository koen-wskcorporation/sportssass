"use client";

import { useRouter } from "next/navigation";
import { AuthDialog, type AuthMode } from "@/components/auth/AuthDialog";

type AuthLoginPagePopupProps = {
  initialMode?: AuthMode;
  errorMessage?: string | null;
  infoMessage?: string | null;
};

export function AuthLoginPagePopup({ initialMode = "signin", errorMessage = null, infoMessage = null }: AuthLoginPagePopupProps) {
  const router = useRouter();

  return <AuthDialog errorMessage={errorMessage} infoMessage={infoMessage} initialMode={initialMode} onClose={() => router.back()} open />;
}
