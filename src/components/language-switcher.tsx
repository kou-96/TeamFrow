"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Globe } from "lucide-react";
import { setLocale } from "@/app/actions/locale";
import { locales, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const t = useTranslations("languages");
  const current = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  function pick(l: Locale) {
    if (l === current) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      await setLocale(l);
      setOpen(false);
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("switch")}
        className="inline-flex items-center gap-1 rounded-md border bg-card px-2 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="font-medium uppercase">{current}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-40 rounded-md border bg-card shadow-md z-50 overflow-hidden">
          <ul className="py-1" role="listbox">
            {locales.map((l) => {
              const active = l === current;
              return (
                <li key={l}>
                  <button
                    type="button"
                    onClick={() => pick(l)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent",
                      active && "bg-accent/50"
                    )}
                    role="option"
                    aria-selected={active}
                  >
                    <Check
                      className={cn("h-4 w-4", active ? "text-primary" : "opacity-0")}
                    />
                    <span>{t(l)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
