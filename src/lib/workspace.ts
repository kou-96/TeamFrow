import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { WorkspaceRole } from "@/lib/supabase/types";

export type CurrentWorkspace = {
  id: string;
  name: string;
  slug: string;
};

export async function requireWorkspace(slug: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // workspace の SELECT は RLS で is_workspace_member 制限されているので、
  // 「存在しない」と「自分にアクセス権がない」は区別できず、どちらも null。
  // 中身を問わず「アクセス不可」として一覧画面へ案内する。
  const { data: ws } = await supabase
    .from("workspaces")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!ws) {
    redirect("/workspaces?notice=no-access");
  }

  const { data: member } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", ws.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) {
    redirect("/workspaces?notice=no-access");
  }

  return {
    workspace: ws as CurrentWorkspace,
    role: member.role as WorkspaceRole,
    user,
  };
}

export function canManage(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin";
}
