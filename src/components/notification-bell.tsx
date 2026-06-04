"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ja, enUS } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/notifications";
import type { NotificationType } from "@/lib/supabase/types";

type NotificationItem = {
  id: string;
  type: NotificationType;
  workspace_id: string | null;
  task_id: string | null;
  comment_id: string | null;
  actor_id: string | null;
  read_at: string | null;
  created_at: string;
  actor_name: string | null;
  workspace_slug: string | null;
  task_title: string | null;
};

export function NotificationBell({ currentUserId }: { currentUserId: string }) {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const dfnsLocale = locale === "ja" ? ja : enUS;

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchAll = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("id, type, workspace_id, task_id, comment_id, actor_id, read_at, created_at")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!data) return;

    // 関連情報を別クエリで取得
    const actorIds = Array.from(new Set(data.map((n) => n.actor_id).filter(Boolean) as string[]));
    const workspaceIds = Array.from(
      new Set(data.map((n) => n.workspace_id).filter(Boolean) as string[])
    );
    const taskIds = Array.from(new Set(data.map((n) => n.task_id).filter(Boolean) as string[]));

    const [actorsRes, workspacesRes, tasksRes] = await Promise.all([
      actorIds.length
        ? supabase.from("profiles").select("id, display_name").in("id", actorIds)
        : Promise.resolve({ data: [] }),
      workspaceIds.length
        ? supabase.from("workspaces").select("id, slug").in("id", workspaceIds)
        : Promise.resolve({ data: [] }),
      taskIds.length
        ? supabase.from("tasks").select("id, title").in("id", taskIds)
        : Promise.resolve({ data: [] }),
    ]);

    const actorMap = new Map(
      (actorsRes.data ?? []).map((a) => [a.id, a.display_name as string | null])
    );
    const workspaceMap = new Map(
      (workspacesRes.data ?? []).map((w) => [w.id, w.slug as string])
    );
    const taskMap = new Map((tasksRes.data ?? []).map((t) => [t.id, t.title as string]));

    const enriched: NotificationItem[] = data.map((n) => ({
      id: n.id,
      type: n.type as NotificationType,
      workspace_id: n.workspace_id,
      task_id: n.task_id,
      comment_id: n.comment_id,
      actor_id: n.actor_id,
      read_at: n.read_at,
      created_at: n.created_at,
      actor_name: n.actor_id ? actorMap.get(n.actor_id) ?? null : null,
      workspace_slug: n.workspace_id ? workspaceMap.get(n.workspace_id) ?? null : null,
      task_title: n.task_id ? taskMap.get(n.task_id) ?? null : null,
    }));

    setItems(enriched);
    setUnread(enriched.filter((n) => !n.read_at).length);
  }, [currentUserId]);

  // 初回 + Realtime 監視
  useEffect(() => {
    fetchAll();

    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const { data: sessionResult } = await supabase.auth.getSession();
      const token = sessionResult.session?.access_token;
      if (token) await supabase.realtime.setAuth(token);
      if (cancelled) return;

      channel = supabase
        .channel(`notifications:${currentUserId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${currentUserId}`,
          },
          () => {
            // 変更が来たら全件再取得 (シンプルかつ間違いがない)
            fetchAll();
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [currentUserId, fetchAll]);

  // クリック外で閉じる
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
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

  function handleItemClick(n: NotificationItem) {
    if (!n.read_at) {
      startTransition(() => markNotificationRead(n.id));
    }
    setOpen(false);
  }

  function handleMarkAll() {
    startTransition(() => markAllNotificationsRead());
  }

  function describe(n: NotificationItem): string {
    const actor = n.actor_name ?? t("someone");
    const task = n.task_title ? `「${n.task_title}」` : "";
    if (n.type === "mentioned") return t("mentioned", { actor, task });
    if (n.type === "assigned") return t("assigned", { actor, task });
    return t("commented", { actor, task });
  }

  function linkFor(n: NotificationItem): string {
    if (n.workspace_slug && n.task_id) {
      return `/workspaces/${n.workspace_slug}`;
    }
    return "/workspaces";
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("title")}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent transition"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-sm rounded-md border bg-popover shadow-md z-50">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <h3 className="text-sm font-semibold">{t("title")}</h3>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                disabled={pending}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 disabled:opacity-50"
              >
                <CheckCheck className="h-3 w-3" /> {t("markAllRead")}
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {t("empty")}
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={linkFor(n)}
                    onClick={() => handleItemClick(n)}
                    className={cn(
                      "block px-3 py-2 hover:bg-accent transition",
                      !n.read_at && "bg-primary/5"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read_at && (
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug">{describe(n)}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {formatDistanceToNow(parseISO(n.created_at), {
                            addSuffix: true,
                            locale: dfnsLocale,
                          })}
                        </p>
                      </div>
                      {n.read_at && (
                        <Check className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
