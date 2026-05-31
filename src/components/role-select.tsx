"use client";

import { useTransition } from "react";
import { cn } from "@/lib/utils";

export function RoleSelect({
  defaultValue,
  ownerLabel,
  adminLabel,
  memberLabel,
  ariaLabel,
}: {
  defaultValue: string;
  ownerLabel: string;
  adminLabel: string;
  memberLabel: string;
  ariaLabel: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      key={defaultValue}
      name="role"
      defaultValue={defaultValue}
      disabled={pending}
      onChange={(e) => {
        const form = e.currentTarget.form;
        if (form) startTransition(() => form.requestSubmit());
      }}
      className={cn(
        "h-8 rounded-md border bg-background px-2 text-xs transition",
        pending && "opacity-60"
      )}
      aria-label={ariaLabel}
    >
      <option value="owner">{ownerLabel}</option>
      <option value="admin">{adminLabel}</option>
      <option value="member">{memberLabel}</option>
    </select>
  );
}
