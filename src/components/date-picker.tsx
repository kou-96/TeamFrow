"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { ja, enUS } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DatePicker({
  value,
  onChange,
  placeholder,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
}) {
  const locale = useLocale();
  const dfnsLocale = locale === "ja" ? ja : enUS;
  const t = useTranslations("task");
  const [open, setOpen] = React.useState(false);

  const selected = value ? parseISO(value) : undefined;
  const display = selected
    ? format(selected, locale === "ja" ? "yyyy/MM/dd (E)" : "EEE, MMM d, yyyy", {
        locale: dfnsLocale,
      })
    : placeholder ?? t("noDueDate");

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "flex-1 h-10 px-3 justify-between gap-2 font-normal",
              "border-input/80 hover:border-input transition",
              !selected && "text-muted-foreground"
            )}
          >
            <span className="flex items-center gap-2 min-w-0">
              <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{display}</span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              onChange(date ? toIsoDate(date) : null);
              setOpen(false);
            }}
            autoFocus
          />
        </PopoverContent>
      </Popover>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-muted-foreground hover:text-foreground"
          onClick={() => onChange(null)}
          aria-label={t("clearDueDate")}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
