"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/workspace";

function fail(slug: string, projectId: string, message: string): never {
  redirect(`/workspaces/${slug}/projects/${projectId}?error=${encodeURIComponent(message)}`);
}

// @表示名 形式のメンションを抽出 (英数 + 日本語 + アンダースコア)
function extractMentions(body: string): string[] {
  const matches = body.match(/@([\p{L}\p{N}_]+)/gu) ?? [];
  return Array.from(new Set(matches.map((m) => m.slice(1))));
}

export async function addComment(
  slug: string,
  projectId: string,
  taskId: string,
  body: string
) {
  const trimmed = body.trim();
  if (!trimmed) return;

  const { workspace, user } = await requireWorkspace(slug);
  const supabase = await createClient();

  // 1. コメント挿入
  const { data: comment, error: insertError } = await supabase
    .from("task_comments")
    .insert({ task_id: taskId, user_id: user.id, body: trimmed })
    .select("id")
    .single();

  if (insertError || !comment) {
    fail(slug, projectId, insertError?.message ?? "comment-insert-failed");
  }

  // 2. メンション解析 → 該当する workspace メンバーに通知
  const mentioned = extractMentions(trimmed);
  if (mentioned.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("display_name", mentioned);

    const memberIds = (profiles ?? []).map((p) => p.id);
    if (memberIds.length > 0) {
      // workspace member だけに絞る
      const { data: members } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspace.id)
        .in("user_id", memberIds);

      const validIds = (members ?? [])
        .map((m) => m.user_id)
        .filter((id) => id !== user.id); // 自分自身は通知不要

      if (validIds.length > 0) {
        await supabase.from("notifications").insert(
          validIds.map((uid) => ({
            user_id: uid,
            type: "mentioned" as const,
            workspace_id: workspace.id,
            task_id: taskId,
            comment_id: comment.id,
            actor_id: user.id,
          }))
        );
      }
    }
  }

  // 3. 担当者にも通知 (本人以外、メンション済みでない場合)
  const { data: task } = await supabase
    .from("tasks")
    .select("assignee_id")
    .eq("id", taskId)
    .maybeSingle();

  if (task?.assignee_id && task.assignee_id !== user.id) {
    // メンションで既に通知済みの場合はスキップ (重複防止)
    const { data: mentionedProfiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", task.assignee_id)
      .in("display_name", mentioned.length > 0 ? mentioned : ["__none__"]);

    if (!mentionedProfiles || mentionedProfiles.length === 0) {
      await supabase.from("notifications").insert({
        user_id: task.assignee_id,
        type: "commented",
        workspace_id: workspace.id,
        task_id: taskId,
        comment_id: comment.id,
        actor_id: user.id,
      });
    }
  }

  revalidatePath(`/workspaces/${slug}/projects/${projectId}`);
}

export async function deleteComment(
  slug: string,
  projectId: string,
  commentId: string
) {
  await requireWorkspace(slug);
  const supabase = await createClient();

  const { error } = await supabase.from("task_comments").delete().eq("id", commentId);

  if (error) fail(slug, projectId, error.message);
  revalidatePath(`/workspaces/${slug}/projects/${projectId}`);
}
