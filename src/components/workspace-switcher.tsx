"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Workspace = { name: string; slug: string };

export function WorkspaceSwitcher({
  current,
  workspaces,
  selectPrompt,
  noWorkspaces,
  createOrList,
}: {
  current?: Workspace;
  workspaces: Workspace[];
  selectPrompt: string;
  noWorkspaces: string;
  createOrList: string;
}) {
  const [open, setOpen] = useState(false);
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

  const label = current?.name ?? selectPrompt;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 text-sm font-medium hover:bg-accent"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate max-w-[180px]">{label}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 mt-1 w-64 rounded-md border bg-card shadow-md z-50 overflow-hidden">
          <ul className="py-1 max-h-72 overflow-y-auto" role="listbox">
            {workspaces.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                {noWorkspaces}
              </li>
            ) : (
              workspaces.map((w) => {
                const active = w.slug === current?.slug;
                return (
                  <li key={w.slug}>
                    <Link
                      href={`/workspaces/${w.slug}`}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent",
                        active && "bg-accent/50"
                      )}
                      onClick={() => setOpen(false)}
                      role="option"
                      aria-selected={active}
                    >
                      <Check
                        className={cn("h-4 w-4", active ? "text-primary" : "opacity-0")}
                      />
                      <span className="truncate">{w.name}</span>
                    </Link>
                  </li>
                );
              })
            )}
          </ul>
          <div className="border-t">
            <Link
              href="/workspaces"
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
              onClick={() => setOpen(false)}
            >
              <Plus className="h-4 w-4" /> {createOrList}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
