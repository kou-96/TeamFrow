import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Users, Trash2, FolderKanban } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DismissibleError } from "@/components/dismissible-error";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/workspace";
import { createProject, deleteProject } from "./actions";

export default async function WorkspaceDashboard({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const { error } = await searchParams;
  const { workspace, role } = await requireWorkspace(slug);
  const supabase = await createClient();
  const t = await getTranslations("dashboard");
  const tr = await getTranslations("roles");

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, description, created_at")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false });

  const { count: memberCount } = await supabase
    .from("workspace_members")
    .select("user_id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id);

  const createProjectWithSlug = createProject.bind(null, slug);
  const deleteProjectWithSlug = deleteProject.bind(null, slug);

  return (
    <>
      <AppHeader workspaceSlug={slug} />
      <main className="container py-8 space-y-8 max-w-6xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{workspace.name}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t("role")}:{" "}
              <span className="font-medium text-foreground">{tr(role)}</span>
              {" · "}
              {t("memberCount", { count: memberCount ?? 0 })}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/workspaces/${slug}/members`}>
              <Users className="h-4 w-4" /> {t("manageMembers")}
            </Link>
          </Button>
        </div>

        <DismissibleError message={error} />

        <div className="grid gap-8 md:grid-cols-[1fr_320px]">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">{t("projects")}</h2>
            {projects && projects.length > 0 ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {projects.map((p) => (
                  <li key={p.id}>
                    <Card className="hover:border-primary/50 transition h-full">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/workspaces/${slug}/projects/${p.id}`}
                            className="flex-1 flex items-start gap-2"
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                              <FolderKanban className="h-4 w-4" />
                            </div>
                            <CardTitle className="text-base">{p.name}</CardTitle>
                          </Link>
                          <form action={deleteProjectWithSlug}>
                            <input type="hidden" name="id" value={p.id} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              aria-label={t("deleteProject")}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </form>
                        </div>
                        {p.description && (
                          <CardDescription className="line-clamp-2 pl-10">
                            {p.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="pt-0 pl-14">
                        <Link
                          href={`/workspaces/${slug}/projects/${p.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {t("openBoard")}
                        </Link>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  {t("noProjects")}
                </CardContent>
              </Card>
            )}
          </section>

          <aside>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("newProject")}</CardTitle>
              </CardHeader>
              <form action={createProjectWithSlug}>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">{t("projectName")}</Label>
                    <Input id="name" name="name" required maxLength={100} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="description">{t("projectDescription")}</Label>
                    <Textarea id="description" name="description" rows={3} />
                  </div>
                  <Button type="submit" className="w-full">
                    {t("newProject")}
                  </Button>
                </CardContent>
              </form>
            </Card>
          </aside>
        </div>
      </main>
    </>
  );
}
