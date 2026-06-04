"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { LogOut, Moon, Sun, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ProfileDialog } from "@/components/profile-dialog";
import { signOut } from "@/app/login/actions";
import { setTheme } from "@/app/actions/theme";
import type { Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function UserMenu({
  displayName,
  email,
  currentTheme,
}: {
  displayName: string;
  email: string;
  currentTheme: Theme;
}) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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

  const initial = (displayName || email || "?").slice(0, 1).toUpperCase();
  const nextTheme: Theme = currentTheme === "dark" ? "light" : "dark";

  function toggleTheme() {
    startTransition(() => setTheme(nextTheme));
  }

  function openProfile() {
    setOpen(false);
    setProfileOpen(true);
  }

  function openLogout() {
    setOpen(false);
    setLogoutOpen(true);
  }

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={tc("userMenu")}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium ring-0 ring-primary/30 hover:ring-4 hover:bg-primary/15 active:scale-95 transition-all duration-200"
        >
          {initial}
        </button>

        {open && (
          <div
            className="absolute right-0 mt-2 w-64 rounded-lg border bg-popover shadow-lg z-50 overflow-hidden origin-top-right animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200 ease-out"
            role="menu"
          >
            <div className="px-3 py-3 border-b">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium shrink-0">
                  {initial}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{email}</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={openProfile}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
            >
              <UserRound className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">{t("profile")}</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              disabled={pending}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left",
                pending && "opacity-50"
              )}
            >
              {currentTheme === "dark" ? (
                <Sun className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Moon className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="flex-1">{t("theme")}</span>
              <span className="text-xs text-muted-foreground">
                {currentTheme === "dark" ? t("themeDark") : t("themeLight")}
              </span>
            </button>

            <div className="border-t">
              <button
                type="button"
                onClick={openLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left text-destructive"
              >
                <LogOut className="h-4 w-4" />
                <span className="flex-1">{tc("logout")}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <ProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        email={email}
        initialName={displayName}
      />
      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title={t("logoutConfirm")}
        description={t("logoutConfirmDescription")}
        confirmLabel={tc("logout")}
        icon={<LogOut className="h-5 w-5 text-muted-foreground" />}
        onConfirm={signOut}
      />
    </>
  );
}
