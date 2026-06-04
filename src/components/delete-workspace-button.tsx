"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteWorkspace } from "@/app/workspaces/actions";

export function DeleteWorkspaceButton({
  id,
  title,
  confirmMessage,
  ariaLabel,
}: {
  id: string;
  title: string;
  confirmMessage: string;
  ariaLabel: string;
}) {
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);

  async function handleConfirm() {
    const fd = new FormData();
    fd.set("id", id);
    await deleteWorkspace(fd);
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label={ariaLabel}
        className="h-7 w-7 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={confirmMessage}
        confirmLabel={tc("delete")}
        destructive
        icon={<Trash2 className="h-5 w-5 text-destructive" />}
        onConfirm={handleConfirm}
      />
    </>
  );
}
