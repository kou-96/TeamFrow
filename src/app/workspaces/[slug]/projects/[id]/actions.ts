"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/workspace";
import type { TaskStatus } from "@/lib/supabase/types";

const STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];

async function ensureProjectInWorkspace(slug: string, projectId: string) {
  await requireWorkspace(slug);
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, workspace_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) {
    redirect(`/workspaces/${slug}`);
  }
  return { supabase, project };
}

function failRedirect(slug: string, projectId: string, message: string): never {
  redirect(`/workspaces/${slug}/projects/${projectId}?error=${encodeURIComponent(message)}`);
}

export async function createTask(slug: string, projectId: string, formData: FormData) {
  const { supabase } = await ensureProjectInWorkspace(slug, projectId);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const title = String(formData.get("title") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "todo");
  const status: TaskStatus = STATUSES.includes(statusRaw as TaskStatus)
    ? (statusRaw as TaskStatus)
    : "todo";

  if (!title) return;

  const { error } = await supabase.from("tasks").insert({
    project_id: projectId,
    title,
    status,
    created_by: user?.id ?? null,
  });

  if (error) failRedirect(slug, projectId, error.message);
  revalidatePath(`/workspaces/${slug}/projects/${projectId}`);
}

export async function updateTaskStatus(
  slug: string,
  projectId: string,
  taskId: string,
  status: TaskStatus
) {
  if (!STATUSES.includes(status)) return;
  const { supabase } = await ensureProjectInWorkspace(slug, projectId);

  const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);

  if (error) failRedirect(slug, projectId, error.message);
  revalidatePath(`/workspaces/${slug}/projects/${projectId}`);
}

export async function deleteTask(slug: string, projectId: string, taskId: string) {
  const { supabase } = await ensureProjectInWorkspace(slug, projectId);

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);

  if (error) failRedirect(slug, projectId, error.message);
  revalidatePath(`/workspaces/${slug}/projects/${projectId}`);
}

export async function updateTaskDescription(
  slug: string,
  projectId: string,
  taskId: string,
  description: string
) {
  const { supabase } = await ensureProjectInWorkspace(slug, projectId);
  const value = description.trim() === "" ? null : description;

  const { error } = await supabase.from("tasks").update({ description: value }).eq("id", taskId);

  if (error) failRedirect(slug, projectId, error.message);
  revalidatePath(`/workspaces/${slug}/projects/${projectId}`);
}

export async function updateTaskAssignee(
  slug: string,
  projectId: string,
  taskId: string,
  assigneeId: string | null
) {
  const { supabase, project } = await ensureProjectInWorkspace(slug, projectId);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("tasks")
    .update({ assignee_id: assigneeId })
    .eq("id", taskId);

  if (error) failRedirect(slug, projectId, error.message);

  // 自分以外を担当者にしたら通知を作成
  if (assigneeId && user && assigneeId !== user.id) {
    await supabase.from("notifications").insert({
      user_id: assigneeId,
      type: "assigned",
      workspace_id: project.workspace_id,
      task_id: taskId,
      actor_id: user.id,
    });
  }

  revalidatePath(`/workspaces/${slug}/projects/${projectId}`);
}

export async function updateTaskDueDate(
  slug: string,
  projectId: string,
  taskId: string,
  dueDate: string | null
) {
  const value = dueDate && dueDate.trim() ? dueDate : null;
  const { supabase } = await ensureProjectInWorkspace(slug, projectId);

  const { error } = await supabase.from("tasks").update({ due_date: value }).eq("id", taskId);

  if (error) failRedirect(slug, projectId, error.message);
  revalidatePath(`/workspaces/${slug}/projects/${projectId}`);
}

export async function toggleTaskLabel(
  slug: string,
  projectId: string,
  taskId: string,
  labelId: string,
  attach: boolean
) {
  const { supabase } = await ensureProjectInWorkspace(slug, projectId);

  if (attach) {
    const { error } = await supabase
      .from("task_labels")
      .insert({ task_id: taskId, label_id: labelId });
    if (error && !error.message.includes("duplicate")) failRedirect(slug, projectId, error.message);
  } else {
    const { error } = await supabase
      .from("task_labels")
      .delete()
      .eq("task_id", taskId)
      .eq("label_id", labelId);
    if (error) failRedirect(slug, projectId, error.message);
  }

  revalidatePath(`/workspaces/${slug}/projects/${projectId}`);
}
