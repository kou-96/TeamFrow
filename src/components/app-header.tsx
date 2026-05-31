import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { NotificationBell } from "./notification-bell";

export async function AppHeader({ workspaceSlug }: { workspaceSlug?: string }) {
  const t = await getTranslations("common");
  const tw = await getTranslations("workspaces");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ?? user?.email ?? "";

  const { data: memberships } = user
    ? await supabase
        .from("workspace_members")
        .select("workspace:workspaces(name, slug)")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: true })
    : { data: [] };

  const workspaces =
    memberships
      ?.map((m) => m.workspace)
      .filter((w): w is { name: string; slug: string } => !!w) ?? [];

  const current = workspaceSlug ? workspaces.find((w) => w.slug === workspaceSlug) : undefined;

  return (
    <header className="border-b bg-card">
      <div className="container flex h-14 items-center justify-between gap-3 pr-16">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/workspaces" className="font-semibold tracking-tight shrink-0">
            {t("appName")}
          </Link>
          <span className="text-muted-foreground shrink-0">/</span>
          <WorkspaceSwitcher
            current={current}
            workspaces={workspaces}
            selectPrompt={tw("selectPrompt")}
            noWorkspaces={tw("noWorkspaces")}
            createOrList={tw("createOrList")}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {user && <NotificationBell currentUserId={user.id} />}
          <span className="hidden sm:inline text-sm text-muted-foreground">{displayName}</span>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              {t("logout")}
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
