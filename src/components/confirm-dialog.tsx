"use client";

import { useTransition, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  icon,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  icon?: ReactNode;
  onConfirm: () => void | Promise<void>;
}) {
  const tc = useTranslations("common");
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      await onConfirm();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          {icon && (
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              {icon}
            </div>
          )}
          <DialogTitle className="text-center sm:text-left">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-center sm:text-left pt-1">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
            className="sm:flex-1"
          >
            {cancelLabel ?? tc("cancel")}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={pending}
            className="sm:flex-1"
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
