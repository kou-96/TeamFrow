import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Tag } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { DismissibleError } from "@/components/dismissible-error";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/workspace";
import { Board } from "./board";

export default async function ProjectBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug, id } = await params;
  const { error } = await searchParams;
  const { workspace, user } = await requireWorkspace(slug);
  const supabase = await createClient();

  const currentUser = {
    id: user.id,
    display_name:
      (user.user_metadata?.display_name as string | undefined) ??
      user.email?.split("@")[0] ??
      "",
  };

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, description, workspace_id")
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!project) notFound();

  const [tasksResult, memberRowsResult, labelsResult] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspace.id)
      .order("joined_at", { ascending: true }),
    supabase
      .from("labels")
      .select("id, workspace_id, name, color, created_at")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: true }),
  ]);

  const tasks = tasksResult.data ?? [];
  const memberRows = memberRowsResult.data ?? [];
  const labels = labelsResult.data ?? [];

  const memberIds = memberRows.map((m) => m.user_id);
  const { data: profileRows } = memberIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", memberIds)
    : { data: [] as { id: string; display_name: string | null }[] };

  const profileMap = new Map((profileRows ?? []).map((p) => [p.id, p.display_name]));
  const members = memberRows.map((m) => ({
    user_id: m.user_id,
    display_name: profileMap.get(m.user_id) ?? null,
  }));

  // タスク → ラベル ID マップ
  const taskIds = tasks.map((t) => t.id);
  const { data: taskLabelRows } = taskIds.length
    ? await supabase.from("task_labels").select("task_id, label_id").in("task_id", taskIds)
    : { data: [] as { task_id: string; label_id: string }[] };

  const taskLabelMap: Record<string, string[]> = {};
  for (const row of taskLabelRows ?? []) {
    if (!taskLabelMap[row.task_id]) taskLabelMap[row.task_id] = [];
    taskLabelMap[row.task_id].push(row.label_id);
  }

  // コメントの取得 (タスク → コメント[])
  const { data: commentRows } = taskIds.length
    ? await supabase
        .from("task_comments")
        .select("id, task_id, user_id, body, created_at")
        .in("task_id", taskIds)
        .order("created_at", { ascending: true })
    : { data: [] as { id: string; task_id: string; user_id: string; body: string; created_at: string }[] };

  const commentAuthorIds = Array.from(new Set((commentRows ?? []).map((c) => c.user_id)));
  const allUserIds = Array.from(new Set([...memberIds, ...commentAuthorIds]));
  const { data: allProfileRows } = allUserIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", allUserIds)
    : { data: [] as { id: string; display_name: string | null }[] };
  const fullProfileMap = new Map((allProfileRows ?? []).map((p) => [p.id, p.display_name]));

  const commentsMap: Record<string, { id: string; user_id: string; body: string; created_at: string; display_name: string | null }[]> = {};
  for (const row of commentRows ?? []) {
    if (!commentsMap[row.task_id]) commentsMap[row.task_id] = [];
    commentsMap[row.task_id].push({
      id: row.id,
      user_id: row.user_id,
      body: row.body,
      created_at: row.created_at,
      display_name: fullProfileMap.get(row.user_id) ?? null,
    });
  }

  return (
    <>
      <AppHeader workspaceSlug={slug} />
      <main className="container py-6 space-y-6 max-w-7xl">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href={`/workspaces/${slug}`}>
              <ChevronLeft className="h-4 w-4" /> {workspace.name}
            </Link>
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
              {project.description && (
                <p className="text-muted-foreground text-sm mt-1">{project.description}</p>
              )}
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/workspaces/${slug}/labels`}>
                <Tag className="h-4 w-4" /> Labels
              </Link>
            </Button>
          </div>
          <DismissibleError message={error} />
        </div>

        <Board
          slug={slug}
          projectId={project.id}
          initialTasks={tasks}
          members={members}
          labels={labels}
          taskLabelMap={taskLabelMap}
          commentsMap={commentsMap}
          currentUser={currentUser}
        />
      </main>
    </>
  );
}
