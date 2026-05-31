"use client";

import { DayPicker, useDayPicker, type DayPickerProps } from "react-day-picker";
import { format } from "date-fns";
import { ja, enUS } from "date-fns/locale";
import { useLocale } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function MonthCaption({ calendarMonth }: { calendarMonth: { date: Date } }) {
  const { previousMonth, nextMonth, goToMonth } = useDayPicker();
  const locale = useLocale();
  const dfnsLocale = locale === "ja" ? ja : enUS;
  const label = format(
    calendarMonth.date,
    locale === "ja" ? "yyyy年M月" : "MMMM yyyy",
    { locale: dfnsLocale }
  );

  return (
    <div className="flex items-center justify-center gap-3 h-9">
      <button
        type="button"
        onClick={() => previousMonth && goToMonth(previousMonth)}
        disabled={!previousMonth}
        aria-label="previous month"
        className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="font-semibold tracking-wide text-sm min-w-[7rem] text-center">
        {label}
      </span>
      <button
        type="button"
        onClick={() => nextMonth && goToMonth(nextMonth)}
        disabled={!nextMonth}
        aria-label="next month"
        className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Calendar({ className, classNames, ...props }: DayPickerProps) {
  const locale = useLocale();
  const dfnsLocale = locale === "ja" ? ja : enUS;

  return (
    <DayPicker
      locale={dfnsLocale}
      className={cn("p-3", className)}
      modifiers={{
        sunday: (date) => date.getDay() === 0,
        saturday: (date) => date.getDay() === 6,
      }}
      modifiersClassNames={{
        sunday: "[&>button]:text-red-500",
        saturday: "[&>button]:text-blue-500",
      }}
      classNames={{
        root: "text-sm select-none",
        months: "flex flex-col gap-4",
        month: "space-y-3",
        nav: "hidden",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "w-9 h-8 inline-flex items-center justify-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground first:text-red-500 last:text-blue-500",
        week: "flex w-full mt-1",
        day: "relative w-9 h-9 p-0 text-center",
        day_button:
          "w-9 h-9 inline-flex items-center justify-center rounded-full text-sm font-medium hover:bg-accent transition focus:outline-none focus:ring-2 focus:ring-ring",
        selected:
          "[&>button]:!bg-primary [&>button]:!text-primary-foreground [&>button]:hover:!bg-primary [&>button]:font-semibold",
        today: "[&>button]:ring-1 [&>button]:ring-primary/40",
        outside: "[&>button]:!text-muted-foreground/40",
        disabled: "[&>button]:opacity-30 [&>button]:cursor-not-allowed",
        ...classNames,
      }}
      components={{
        MonthCaption,
      }}
      {...props}
    />
  );
}
