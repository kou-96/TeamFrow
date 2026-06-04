"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { signOut } from "@/app/login/actions";

export function LogoutButton() {
  const t = useTranslations("common");
  const ta = useTranslations("auth");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="px-2 sm:px-3"
        onClick={() => setOpen(true)}
        aria-label={t("logout")}
      >
        <LogOut className="h-4 w-4 sm:hidden" />
        <span className="hidden sm:inline">{t("logout")}</span>
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={ta("logoutConfirm")}
        description={ta("logoutConfirmDescription")}
        confirmLabel={t("logout")}
        icon={<LogOut className="h-5 w-5 text-muted-foreground" />}
        onConfirm={signOut}
      />
    </>
  );
}
