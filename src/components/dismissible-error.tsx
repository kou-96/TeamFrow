"use client";

import { AlertCircle, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslatedError } from "@/lib/translate-error";

export function DismissibleError({ message }: { message?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const translate = useTranslatedError();

  if (!message) return null;

  return (
    <Alert variant="destructive" className="pr-10">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{translate(message)}</AlertDescription>
      <button
        type="button"
        onClick={() => router.replace(pathname)}
        aria-label="閉じる"
        className="absolute right-2 top-2 rounded p-1 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
      >
        <X className="h-4 w-4" />
      </button>
    </Alert>
  );
}
