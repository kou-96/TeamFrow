"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { LABEL_COLORS, labelDotClass, type LabelColor } from "@/lib/labels";

export function LabelColorPicker({
  name = "color",
  defaultValue = "slate",
}: {
  name?: string;
  defaultValue?: LabelColor;
}) {
  const [selected, setSelected] = useState<LabelColor>(defaultValue);
  return (
    <>
      <input type="hidden" name={name} value={selected} />
      <div className="flex flex-wrap gap-1.5">
        {LABEL_COLORS.map((c) => {
          const active = selected === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setSelected(c)}
              aria-label={c}
              aria-pressed={active}
              className={cn(
                "relative rounded-full p-0.5 transition ring-offset-2",
                active ? "ring-2 ring-foreground" : "hover:opacity-80"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full",
                  labelDotClass(c)
                )}
              >
                {active && <Check className="h-3.5 w-3.5 text-white drop-shadow" />}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
