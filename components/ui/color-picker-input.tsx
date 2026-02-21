"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ColorPickerInputProps = {
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

function sanitizeHexInput(value: string) {
  return value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6).toLowerCase();
}

function toSixDigitHex(rawHex: string) {
  if (rawHex.length === 6) {
    return `#${rawHex}`;
  }

  if (rawHex.length === 3) {
    return `#${rawHex[0]}${rawHex[0]}${rawHex[1]}${rawHex[1]}${rawHex[2]}${rawHex[2]}`;
  }

  return null;
}

export function ColorPickerInput({ name, defaultValue, placeholder = "00EAFF", disabled, className }: ColorPickerInputProps) {
  const pickerRef = React.useRef<HTMLInputElement | null>(null);
  const [rawHex, setRawHex] = React.useState(() => sanitizeHexInput((defaultValue ?? "").replace(/^#/, "")));

  const normalizedHex = toSixDigitHex(rawHex);
  const pickerColor = normalizedHex ?? "#00eaff";
  const submittedValue = rawHex.length === 0 ? "" : `#${rawHex}`;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <button
        aria-label="Choose accent color"
        className="h-8 w-8 shrink-0 rounded-full border border-border transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        disabled={disabled}
        onClick={() => pickerRef.current?.click()}
        style={{ backgroundColor: pickerColor }}
        type="button"
      />

      <Input
        autoComplete="off"
        disabled={disabled}
        onChange={(event) => {
          event.currentTarget.value = sanitizeHexInput(event.currentTarget.value);
          setRawHex(event.currentTarget.value);
        }}
        pattern="^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$"
        persistentPrefix="#"
        placeholder={placeholder}
        title="Use 3 or 6 hexadecimal characters"
        value={rawHex}
      />

      <input name={name} type="hidden" value={submittedValue} />

      <input
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          const pickedHex = sanitizeHexInput(event.currentTarget.value.replace(/^#/, ""));
          setRawHex(pickedHex);
        }}
        ref={pickerRef}
        type="color"
        value={pickerColor}
      />
    </div>
  );
}
