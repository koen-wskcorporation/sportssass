import Link from "next/link";
import { PrimaryAccountControls } from "@/components/shared/PrimaryAccountControls";

export function PrimaryHeader() {
  return (
    <header className="border-b bg-surface">
      <div className="app-container flex h-16 items-center justify-between">
        <Link className="inline-flex min-w-0 items-center" href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Sports SaaS logo"
            className="block max-w-full object-contain"
            src="/brand/logo.svg"
            style={{ height: "auto", width: "clamp(110px, 16vw, 180px)" }}
          />
        </Link>

        <PrimaryAccountControls />
      </div>
    </header>
  );
}
