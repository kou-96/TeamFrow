import Link from "next/link";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";
import { THEME_COOKIE, type Theme } from "@/lib/theme";

export async function AppHeader({ workspaceSlug }: { workspaceSlug?: string }) {
  const t = await getTranslations("common");
  const tw = await getTranslations("workspaces");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ?? user?.email?.split("@")[0] ?? "";
  const email = user?.email ?? "";

  const cookieStore = await cookies();
  const theme: Theme = cookieStore.get(THEME_COOKIE)?.value === "dark" ? "dark" : "light";

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
    <header
      className="border-b bg-card sticky top-0 z-40"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="container flex h-14 items-center justify-between gap-2 sm:gap-3 pr-20 sm:pr-24">
        <div className="flex items-center gap-3 sm:gap-3 min-w-0">
          <Link
            href="/workspaces"
            className="font-semibold tracking-tight shrink-0 text-sm sm:text-base"
          >
            {t("appName")}
          </Link>
          <span className="text-muted-foreground shrink-0 hidden sm:inline">/</span>
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
          {user && <UserMenu displayName={displayName} email={email} currentTheme={theme} />}
        </div>
      </div>
    </header>
  );
}
