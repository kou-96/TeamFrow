"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, Plus, Trash2, X, UserRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/date-picker";
import { cn } from "@/lib/utils";
import { classifyDueDate, dueBadgeClass } from "@/lib/due-date";
import { labelColorClasses, labelDotClass } from "@/lib/labels";
import type { Database } from "@/lib/supabase/types";
import {
  deleteTask,
  toggleTaskLabel,
  updateTaskAssignee,
  updateTaskDescription,
  updateTaskDueDate,
  updateTaskTitle,
} from "./actions";
import { CommentsSection, type CommentEntry } from "./comments";

type Task = Database["public"]["Tables"]["tasks"]["Row"];
type Label = Database["public"]["Tables"]["labels"]["Row"];
type Member = { user_id: string; display_name: string | null };

export function TaskDetailModal({
  open,
  onOpenChange,
  task,
  taskLabelIds,
  members,
  labels,
  comments,
  currentUserId,
  slug,
  projectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  taskLabelIds: string[];
  members: Member[];
  labels: Label[];
  comments: CommentEntry[];
  currentUserId: string;
  slug: string;
  projectId: string;
}) {
  const t = useTranslations("task");
  const tc = useTranslations("common");
  const [, startTransition] = useTransition();

  // ローカル編集状態 (タスクが変わったら同期)
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [editingDescription, setEditingDescription] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setEditingDescription(false);
    }
  }, [task]);

  const dueState = useMemo(() => classifyDueDate(task?.due_date ?? null), [task?.due_date]);
  const assignee = task?.assignee_id
    ? members.find((m) => m.user_id === task.assignee_id) ?? null
    : null;
  const assignedLabelIds = new Set(taskLabelIds);

  if (!task) return null;

  function commitTitle() {
    if (!task) return;
    const trimmed = title.trim();
    if (!trimmed || trimmed === task.title) {
      setTitle(task.title);
      return;
    }
    startTransition(() => updateTaskTitle(slug, projectId, task.id, trimmed));
  }

  function commitDescription() {
    if (!task) return;
    if ((task.description ?? "") === description) {
      setEditingDescription(false);
      return;
    }
    startTransition(() => {
      updateTaskDescription(slug, projectId, task.id, description);
      setEditingDescription(false);
    });
  }

  function pickAssignee(userId: string | null) {
    if (!task) return;
    if ((task.assignee_id ?? null) === userId) return;
    startTransition(() => updateTaskAssignee(slug, projectId, task.id, userId));
  }

  function pickDueDate(value: string | null) {
    if (!task) return;
    if ((task.due_date ?? null) === value) return;
    startTransition(() => updateTaskDueDate(slug, projectId, task.id, value));
  }

  function handleToggleLabel(labelId: string) {
    if (!task) return;
    const attach = !assignedLabelIds.has(labelId);
    startTransition(() => toggleTaskLabel(slug, projectId, task.id, labelId, attach));
  }

  function handleDelete() {
    if (!task) return;
    startTransition(() => {
      deleteTask(slug, projectId, task.id);
      onOpenChange(false);
    });
  }

  const initial = assignee?.display_name?.slice(0, 1).toUpperCase() ?? "?";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="sr-only">{t("detailTitle")}</DialogTitle>
        <DialogDescription className="sr-only">{t("detailTitle")}</DialogDescription>

        {/* タイトル */}
        <div className="pr-8">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            className="text-lg font-semibold !h-auto border-transparent shadow-none focus-visible:border-input px-2"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_220px]">
          {/* メイン: 説明 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("description")}
              </h3>
              {!editingDescription && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  onClick={() => setEditingDescription(true)}
                >
                  {t("edit")}
                </Button>
              )}
            </div>
            {editingDescription ? (
              <div className="space-y-2">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("descriptionPlaceholder")}
                  rows={10}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={commitDescription}>
                    {tc("save")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDescription(task.description ?? "");
                      setEditingDescription(false);
                    }}
                  >
                    {tc("cancel")}
                  </Button>
                </div>
              </div>
            ) : description ? (
              <div className="prose prose-sm max-w-none rounded-md border bg-muted/30 p-3 leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{description}</ReactMarkdown>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingDescription(true)}
                className="w-full text-left rounded-md border border-dashed px-3 py-6 text-sm text-muted-foreground hover:bg-muted/50"
              >
                {t("noDescription")}
              </button>
            )}

            <div className="pt-4 border-t">
              <CommentsSection
                comments={comments}
                members={members}
                currentUserId={currentUserId}
                slug={slug}
                projectId={projectId}
                taskId={task.id}
              />
            </div>
          </div>

          {/* サイドバー */}
          <aside className="space-y-5">
            {/* 担当者 */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("assignee")}
              </h3>
              <AssigneePicker
                assignee={assignee}
                assigneeId={task.assignee_id}
                members={members}
                noAssigneeLabel={t("noAssignee")}
                unassignLabel={t("unassign")}
                onPick={pickAssignee}
              />
            </div>

            {/* 期限 */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("dueDate")}
              </h3>
              <DatePicker value={task.due_date} onChange={pickDueDate} />
              {dueState !== "none" && dueState !== "future" && (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs",
                    dueBadgeClass(dueState)
                  )}
                >
                  {dueState === "overdue" && t("overdue")}
                  {dueState === "today" && t("dueToday")}
                  {dueState === "tomorrow" && t("dueTomorrow")}
                </span>
              )}
            </div>

            {/* ラベル */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("labels")}
              </h3>
              {labels.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("noLabels")}</p>
              ) : (
                <ul className="space-y-1">
                  {labels.map((l) => {
                    const active = assignedLabelIds.has(l.id);
                    return (
                      <li key={l.id}>
                        <button
                          type="button"
                          onClick={() => handleToggleLabel(l.id)}
                          className={cn(
                            "w-full flex items-center gap-2 rounded-md border px-2 py-1 text-xs hover:bg-accent",
                            active && labelColorClasses(l.color)
                          )}
                        >
                          <span className={cn("h-2 w-2 rounded-full", labelDotClass(l.color))} />
                          <span className="flex-1 text-left truncate">{l.name}</span>
                          {active ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* 削除 */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20"
            >
              <Trash2 className="h-3.5 w-3.5" /> {tc("delete")}
            </Button>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AssigneePicker({
  assignee,
  assigneeId,
  members,
  noAssigneeLabel,
  unassignLabel,
  onPick,
}: {
  assignee: Member | null;
  assigneeId: string | null;
  members: Member[];
  noAssigneeLabel: string;
  unassignLabel: string;
  onPick: (userId: string | null) => void;
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

  function pick(userId: string | null) {
    onPick(userId);
    setOpen(false);
  }

  const initial = assignee?.display_name?.slice(0, 1).toUpperCase() ?? "?";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm hover:bg-accent"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {assignee ? (
          <>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
              {initial}
            </span>
            <span className="flex-1 truncate text-left">
              {assignee.display_name ?? "(unknown)"}
            </span>
          </>
        ) : (
          <>
            <UserRound className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-left text-muted-foreground">{noAssigneeLabel}</span>
          </>
        )}
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 mt-1 rounded-md border bg-popover shadow-md overflow-hidden z-10">
          <button
            type="button"
            onClick={() => pick(null)}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent text-muted-foreground"
          >
            <X className="h-4 w-4" /> {unassignLabel}
          </button>
          {members.map((m) => {
            const active = m.user_id === assigneeId;
            return (
              <button
                key={m.user_id}
                type="button"
                onClick={() => pick(m.user_id)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent",
                  active && "bg-accent/50"
                )}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                  {(m.display_name ?? "?").slice(0, 1).toUpperCase()}
                </span>
                <span className="flex-1 truncate text-left">
                  {m.display_name ?? "(unknown)"}
                </span>
                {active && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
