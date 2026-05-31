"use client";

import * as React from "react";
import { Input } from "./input";

export const AsciiInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function AsciiInput({ onInput, ...props }, ref) {
  return (
    <Input
      ref={ref}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      lang="en"
      {...props}
      onInput={(e) => {
        const target = e.currentTarget;
        const cleaned = target.value.replace(/[^\x20-\x7E]/g, "");
        if (target.value !== cleaned) target.value = cleaned;
        onInput?.(e);
      }}
    />
  );
});
