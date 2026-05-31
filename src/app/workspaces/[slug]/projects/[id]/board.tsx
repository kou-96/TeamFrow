"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CalendarDays, GripVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { classifyDueDate, dueBadgeClass } from "@/lib/due-date";
import { labelColorClasses } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";
import type { TaskStatus, Database } from "@/lib/supabase/types";
import { createTask, updateTaskStatus } from "./actions";
import { TaskDetailModal } from "./task-detail";
import type { CommentEntry } from "./comments";

type Task = Database["public"]["Tables"]["tasks"]["Row"];
type Label = Database["public"]["Tables"]["labels"]["Row"];
type Member = { user_id: string; display_name: string | null };
type CurrentUser = { id: string; display_name: string };
type PresenceEntry = { user_id: string; display_name: string };

type BoardContext = {
  slug: string;
  projectId: string;
  members: Member[];
  labels: Label[];
  taskLabelMap: Record<string, string[]>;
  onOpenTask: (task: Task) => void;
};

const COLUMN_TONES: Record<TaskStatus, string> = {
  todo: "border-slate-300",
  in_progress: "border-blue-300",
  done: "border-emerald-300",
};

function groupTasks(tasks: Task[]): Record<TaskStatus, Task[]> {
  const out: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] };
  for (const t of tasks) out[t.status].push(t);
  return out;
}

function TaskCard({ task, ctx }: { task: Task; ctx: BoardContext }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  const t = useTranslations("board");
  const ttask = useTranslations("task");

  const assignee = task.assignee_id
    ? ctx.members.find((m) => m.user_id === task.assignee_id)
    : null;
  const initial = assignee?.display_name?.slice(0, 1).toUpperCase() ?? "?";
  const dueState = classifyDueDate(task.due_date);
  const assignedLabels =
    (ctx.taskLabelMap[task.id] ?? [])
      .map((id) => ctx.labels.find((l) => l.id === id))
      .filter((l): l is Label => !!l);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group rounded-md border bg-card p-3 shadow-sm space-y-2 cursor-pointer hover:border-primary/40 transition",
        isDragging && "opacity-40"
      )}
      role="button"
      tabIndex={0}
      onClick={() => ctx.onOpenTask(task)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          ctx.onOpenTask(task);
        }
      }}
      aria-label={t("openTask")}
    >
      {assignedLabels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {assignedLabels.map((l) => (
            <span
              key={l.id}
              className={cn(
                "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium border",
                labelColorClasses(l.color)
              )}
            >
              {l.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 cursor-grab text-muted-foreground hover:text-foreground"
          aria-label={t("dragHint")}
          onClick={(e) => e.stopPropagation()}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <p className="flex-1 text-sm leading-snug break-words">{task.title}</p>
      </div>

      {(task.due_date || assignee) && (
        <div className="flex items-center gap-2 pl-6">
          {task.due_date && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px]",
                dueBadgeClass(dueState)
              )}
              title={task.due_date}
            >
              <CalendarDays className="h-3 w-3" />
              {dueState === "overdue"
                ? ttask("overdue")
                : dueState === "today"
                  ? ttask("dueToday")
                  : dueState === "tomorrow"
                    ? ttask("dueTomorrow")
                    : task.due_date.slice(5).replace("-", "/")}
            </span>
          )}
          <span className="ml-auto" />
          {assignee && (
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-medium"
              title={assignee.display_name ?? ""}
            >
              {initial}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function Column({
  status,
  label,
  tone,
  tasks,
  ctx,
}: {
  status: TaskStatus;
  label: string;
  tone: string;
  tasks: Task[];
  ctx: BoardContext;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();
  const t = useTranslations("board");
  const tc = useTranslations("common");

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) {
      setAdding(false);
      return;
    }
    const fd = new FormData();
    fd.set("title", trimmed);
    fd.set("status", status);
    startTransition(async () => {
      await createTask(ctx.slug, ctx.projectId, fd);
      setTitle("");
      setAdding(false);
    });
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col gap-3 rounded-lg border-2 border-dashed bg-muted/30 p-3 min-h-[300px]",
        tone,
        isOver && "bg-muted/60"
      )}
    >
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold">
          {label}{" "}
          <span className="text-muted-foreground font-normal">
            {t("count", { count: tasks.length })}
          </span>
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setAdding((v) => !v)}
          aria-label={t("addTask")}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} ctx={ctx} />
        ))}
      </div>

      {adding && (
        <div className="rounded-md border bg-card p-2 space-y-2">
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("taskPlaceholder")}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              } else if (e.key === "Escape") {
                setAdding(false);
                setTitle("");
              }
            }}
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={submit} disabled={pending}>
              {tc("add")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setAdding(false);
                setTitle("");
              }}
            >
              {tc("cancel")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PresenceBar({
  users,
  currentUserId,
}: {
  users: PresenceEntry[];
  currentUserId: string;
}) {
  const t = useTranslations("board");
  // 自分を含む全員 (重複排除)
  const unique = Array.from(new Map(users.map((u) => [u.user_id, u])).values());
  const display = unique.slice(0, 5);
  const overflow = Math.max(0, unique.length - display.length);

  if (unique.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center -space-x-2">
        {display.map((u) => {
          const isMe = u.user_id === currentUserId;
          const initial = (u.display_name || "?").slice(0, 1).toUpperCase();
          return (
            <span
              key={u.user_id}
              title={u.display_name + (isMe ? " (you)" : "")}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-medium ring-2 ring-background",
                isMe ? "bg-primary text-primary-foreground" : "bg-emerald-100 text-emerald-700"
              )}
            >
              {initial}
            </span>
          );
        })}
        {overflow > 0 && (
          <span className="flex h-7 px-2 items-center justify-center rounded-full bg-muted text-muted-foreground text-[11px] ring-2 ring-background">
            +{overflow}
          </span>
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        {t("online", { count: unique.length })}
      </span>
    </div>
  );
}

export function Board({
  slug,
  projectId,
  initialTasks,
  members,
  labels,
  taskLabelMap,
  commentsMap,
  currentUser,
}: {
  slug: string;
  projectId: string;
  initialTasks: Task[];
  members: Member[];
  labels: Label[];
  taskLabelMap: Record<string, string[]>;
  commentsMap: Record<string, CommentEntry[]>;
  currentUser: CurrentUser;
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [presence, setPresence] = useState<PresenceEntry[]>([]);
  const [mounted, setMounted] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  // dnd-kit の内部 ID が SSR/CSR で食い違うため、マウント後だけ DnD コンテキストを有効化
  useEffect(() => {
    setMounted(true);
  }, []);

  const grouped = useMemo(() => groupTasks(tasks), [tasks]);
  const activeTask = useMemo(
    () => (activeId ? tasks.find((task) => task.id === activeId) ?? null : null),
    [activeId, tasks]
  );
  const openTask = useMemo(
    () => (openTaskId ? tasks.find((task) => task.id === openTaskId) ?? null : null),
    [openTaskId, tasks]
  );

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const taskId = String(e.active.id);
    const overId = e.over?.id;
    if (!overId) return;

    const newStatus = String(overId) as TaskStatus;
    if (!["todo", "in_progress", "done"].includes(newStatus)) return;

    const current = tasks.find((task) => task.id === taskId);
    if (!current || current.status === newStatus) return;

    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, status: newStatus } : task))
    );
    updateTaskStatus(slug, projectId, taskId, newStatus);
  }

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // ---------------------------------------------------------------
  // Realtime: タスクの INSERT / UPDATE / DELETE を購読
  // + Presence: 同じボードを見ているユーザーを track
  // ---------------------------------------------------------------
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      // @supabase/ssr の cookie セッションを realtime に明示的に渡す。
      // これをしないと anon 扱いになり、tasks の RLS で event がフィルタされて配信されない。
      const { data: sessionResult } = await supabase.auth.getSession();
      const token = sessionResult.session?.access_token;
      if (token) await supabase.realtime.setAuth(token);
      if (cancelled) return;

      const ch = supabase.channel(`project:${projectId}`, {
        config: { presence: { key: currentUser.id } },
      });
      channel = ch;

      ch
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "tasks",
            filter: `project_id=eq.${projectId}`,
          },
          (payload) => {
            const row = payload.new as Task;
            setTasks((prev) => (prev.some((t) => t.id === row.id) ? prev : [...prev, row]));
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "tasks",
            filter: `project_id=eq.${projectId}`,
          },
          (payload) => {
            const row = payload.new as Task;
            setTasks((prev) => prev.map((t) => (t.id === row.id ? row : t)));
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "tasks",
            filter: `project_id=eq.${projectId}`,
          },
          (payload) => {
            const oldRow = payload.old as { id: string };
            setTasks((prev) => prev.filter((t) => t.id !== oldRow.id));
          }
        )
        .on("presence", { event: "sync" }, () => {
          const state = ch.presenceState<PresenceEntry>();
          const entries: PresenceEntry[] = [];
          for (const key of Object.keys(state)) {
            for (const item of state[key]) {
              entries.push({ user_id: item.user_id, display_name: item.display_name });
            }
          }
          setPresence(entries);
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await ch.track({
              user_id: currentUser.id,
              display_name: currentUser.display_name,
            });
          }
        });
    })();

    return () => {
      cancelled = true;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [projectId, currentUser.id, currentUser.display_name]);

  const t = useTranslations("board");
  const columnLabels: Record<TaskStatus, string> = {
    todo: t("columnTodo"),
    in_progress: t("columnInProgress"),
    done: t("columnDone"),
  };
  const order: TaskStatus[] = ["todo", "in_progress", "done"];

  const ctx: BoardContext = {
    slug,
    projectId,
    members,
    labels,
    taskLabelMap,
    onOpenTask: (task) => setOpenTaskId(task.id),
  };

  const columns = (
    <div className="grid gap-4 md:grid-cols-3">
      {order.map((status) => (
        <Column
          key={status}
          status={status}
          label={columnLabels[status]}
          tone={COLUMN_TONES[status]}
          tasks={grouped[status]}
          ctx={ctx}
        />
      ))}
    </div>
  );

  return (
    <>
      <div className="flex justify-end">
        <PresenceBar users={presence} currentUserId={currentUser.id} />
      </div>
      {mounted ? (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          {columns}
          <DragOverlay>
            {activeTask && (
              <div className="rounded-md border bg-card p-3 shadow-md text-sm">
                {activeTask.title}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        columns
      )}
      <TaskDetailModal
        open={openTaskId !== null}
        onOpenChange={(o) => !o && setOpenTaskId(null)}
        task={openTask}
        taskLabelIds={openTaskId ? taskLabelMap[openTaskId] ?? [] : []}
        members={members}
        labels={labels}
        comments={openTaskId ? commentsMap[openTaskId] ?? [] : []}
        currentUserId={currentUser.id}
        slug={slug}
        projectId={projectId}
      />
    </>
  );
}
