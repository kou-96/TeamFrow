"use client";

import { useEffect, useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslatedError } from "@/lib/translate-error";

export function DismissibleError({ message }: { message?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const translate = useTranslatedError();
  // 一度受け取ったメッセージは local state で保持し、URL からは即座にクリア。
  // これでリロードしてもエラーが再表示されない。
  const [stored, setStored] = useState<string | undefined>(message);

  useEffect(() => {
    if (message) {
      setStored(message);
      router.replace(pathname);
    }
  }, [message, router, pathname]);

  if (!stored) return null;

  return (
    <Alert variant="destructive" className="pr-10">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{translate(stored)}</AlertDescription>
      <button
        type="button"
        onClick={() => setStored(undefined)}
        aria-label="閉じる"
        className="absolute right-2 top-2 rounded p-1 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
      >
        <X className="h-4 w-4" />
      </button>
    </Alert>
  );
}
