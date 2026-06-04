"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { updateDisplayName } from "@/app/actions/profile";
import { useTranslatedError } from "@/lib/translate-error";

type Mode = "view" | "edit";

export function ProfileDialog({
  open,
  onOpenChange,
  email,
  initialName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  initialName: string;
}) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const translate = useTranslatedError();

  const [mode, setMode] = useState<Mode>("view");
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  // モーダルが開かれるたびに view モードにリセット
  useEffect(() => {
    if (open) {
      setMode("view");
      setName(initialName);
      setError(undefined);
    }
  }, [open, initialName]);

  function handleSave() {
    setError(undefined);
    startTransition(async () => {
      const result = await updateDisplayName(name);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
    });
  }

  const initial = (initialName || email).slice(0, 1).toUpperCase();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!pending) onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-semibold">
            {initial}
          </div>
          <DialogTitle className="text-center">{t("profile")}</DialogTitle>
          <DialogDescription className="sr-only">{t("profileEditTitle")}</DialogDescription>
        </DialogHeader>

        {mode === "view" ? (
          <div className="space-y-3">
            <div className="rounded-md border p-3 space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("profileNameLabel")}
                </span>
                <p className="text-sm font-medium truncate min-w-0">{initialName}</p>
              </div>
              <div className="border-t pt-2 flex items-baseline justify-between gap-2">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("email")}
                </span>
                <p className="text-sm font-mono text-muted-foreground truncate min-w-0">
                  {email}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">{t("profileNameLabel")}</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                disabled={pending}
              />
            </div>
            <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {email}
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{translate(error)}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {mode === "view" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="sm:flex-1"
              >
                {tc("close")}
              </Button>
              <Button
                type="button"
                onClick={() => setMode("edit")}
                className="sm:flex-1 gap-1"
              >
                <Pencil className="h-3.5 w-3.5" />
                {tc("edit")}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setMode("view");
                  setName(initialName);
                  setError(undefined);
                }}
                disabled={pending}
                className="sm:flex-1"
              >
                {tc("cancel")}
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={
                  pending || !name.trim() || name.trim() === initialName
                }
                className="sm:flex-1"
              >
                {tc("save")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
