"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLocale, useTranslations } from "next-intl";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ja, enUS } from "date-fns/locale";
import { Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { addComment, deleteComment } from "./comment-actions";

export type CommentEntry = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  display_name: string | null;
};

type Member = { user_id: string; display_name: string | null };

const MENTION_REGEX = /@([\p{L}\p{N}_]+)/gu;

function renderMentionsAsMarkdown(body: string): string {
  return body.replace(MENTION_REGEX, "**@$1**");
}

export function CommentsSection({
  comments: initialComments,
  members,
  currentUserId,
  slug,
  projectId,
  taskId,
}: {
  comments: CommentEntry[];
  members: Member[];
  currentUserId: string;
  slug: string;
  projectId: string;
  taskId: string;
}) {
  const t = useTranslations("task");
  const tc = useTranslations("common");
  const locale = useLocale();
  const dfnsLocale = locale === "ja" ? ja : enUS;

  const [comments, setComments] = useState<CommentEntry[]>(initialComments);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 初期データ・タスク切替時の同期
  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  // Realtime: 他ユーザーのコメント追加/削除を即時反映 + マウント時に DB から最新取得
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const { data: sessionResult } = await supabase.auth.getSession();
      const token = sessionResult.session?.access_token;
      if (token) await supabase.realtime.setAuth(token);
      if (cancelled) return;

      // モーダル開いた瞬間に DB から最新を取り直す
      // (props は page load 時点のスナップショットで stale な可能性があるため)
      const { data: latestRows } = await supabase
        .from("task_comments")
        .select("id, user_id, body, created_at")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (latestRows) {
        setComments(
          latestRows.map((row) => {
            const member = members.find((m) => m.user_id === row.user_id);
            return {
              id: row.id,
              user_id: row.user_id,
              body: row.body,
              created_at: row.created_at,
              display_name: member?.display_name ?? null,
            };
          })
        );
      }

      channel = supabase
        .channel(`task-comments:${taskId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "task_comments",
            filter: `task_id=eq.${taskId}`,
          },
          (payload) => {
            const row = payload.new as {
              id: string;
              user_id: string;
              body: string;
              created_at: string;
            };
            const member = members.find((m) => m.user_id === row.user_id);
            setComments((prev) =>
              prev.some((c) => c.id === row.id)
                ? prev
                : [
                    ...prev,
                    {
                      id: row.id,
                      user_id: row.user_id,
                      body: row.body,
                      created_at: row.created_at,
                      display_name: member?.display_name ?? null,
                    },
                  ]
            );
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "task_comments",
            filter: `task_id=eq.${taskId}`,
          },
          (payload) => {
            const oldRow = payload.old as { id: string };
            setComments((prev) => prev.filter((c) => c.id !== oldRow.id));
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [taskId, members]);

  function updateMentionSearch(value: string, cursorPos: number) {
    const before = value.slice(0, cursorPos);
    const match = before.match(/@([\p{L}\p{N}_]*)$/u);
    setMentionSearch(match ? match[1] : null);
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setBody(v);
    updateMentionSearch(v, e.target.selectionStart);
  }

  function insertMention(displayName: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const before = body.slice(0, pos).replace(/@([\p{L}\p{N}_]*)$/u, `@${displayName} `);
    const after = body.slice(pos);
    const next = before + after;
    setBody(next);
    setMentionSearch(null);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(before.length, before.length);
    });
  }

  function submit() {
    const trimmed = body.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await addComment(slug, projectId, taskId, trimmed);
      setBody("");
      setMentionSearch(null);
    });
  }

  function handleDelete(commentId: string) {
    startTransition(() => deleteComment(slug, projectId, commentId));
  }

  const filteredMembers =
    mentionSearch !== null
      ? members
          .filter((m) =>
            (m.display_name ?? "").toLowerCase().startsWith(mentionSearch.toLowerCase())
          )
          .slice(0, 5)
      : [];

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("comments")} ({comments.length})
      </h3>

      {comments.length > 0 && (
        <ul className="space-y-3">
          {comments.map((c) => {
            const isOwn = c.user_id === currentUserId;
            const displayName = c.display_name ?? "(unknown)";
            const initial = displayName.slice(0, 1).toUpperCase();
            const relative = formatDistanceToNow(parseISO(c.created_at), {
              addSuffix: true,
              locale: dfnsLocale,
            });
            const abs = format(parseISO(c.created_at), "PPpp", { locale: dfnsLocale });
            return (
              <li
                key={c.id}
                className="group rounded-md border bg-card p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
                      {initial}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{displayName}</p>
                      <p className="text-[11px] text-muted-foreground" title={abs}>
                        {relative}
                      </p>
                    </div>
                  </div>
                  {isOwn && (
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                      aria-label={tc("delete")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {renderMentionsAsMarkdown(c.body)}
                  </ReactMarkdown>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="relative space-y-2">
        <Textarea
          ref={textareaRef}
          value={body}
          onChange={handleChange}
          onSelect={(e) =>
            updateMentionSearch(
              e.currentTarget.value,
              e.currentTarget.selectionStart ?? 0
            )
          }
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              submit();
            } else if (e.key === "Escape" && mentionSearch !== null) {
              setMentionSearch(null);
            }
          }}
          placeholder={t("commentPlaceholder")}
          rows={3}
          disabled={pending}
        />

        {mentionSearch !== null && filteredMembers.length > 0 && (
          <div className="absolute left-0 bottom-full mb-1 z-10 w-64 rounded-md border bg-popover shadow-md overflow-hidden">
            <ul className="py-1 max-h-48 overflow-y-auto">
              {filteredMembers.map((m) => (
                <li key={m.user_id}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertMention(m.display_name ?? "");
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                      {(m.display_name ?? "?").slice(0, 1).toUpperCase()}
                    </span>
                    <span className="truncate">{m.display_name ?? "(unknown)"}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">
            {t("commentHint")}
          </p>
          <Button
            type="button"
            size="sm"
            onClick={submit}
            disabled={pending || !body.trim()}
            className={cn("gap-1")}
          >
            <Send className="h-3.5 w-3.5" />
            {t("postComment")}
          </Button>
        </div>
      </div>
    </div>
  );
}
