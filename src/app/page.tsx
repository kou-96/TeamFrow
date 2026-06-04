import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LayoutGrid, MousePointerClick, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/workspaces");

  const t = await getTranslations("landing");

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-100 via-background to-background" />

      <div className="container flex min-h-dvh flex-col items-center justify-center gap-12 px-6 py-16 text-center">
        <div className="space-y-5 max-w-2xl">
          <span className="inline-flex items-center rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
            {t("tagline")}
          </span>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
            {t("heroLine1")}
            <br />
            <span className="bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              {t("heroLine2")}
            </span>
          </h1>
          <p className="text-muted-foreground text-lg">
            {t("subhead1")}
            <br className="hidden sm:block" />
            {t("subhead2")}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild size="lg">
            <Link href="/signup">{t("ctaPrimary")}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">{t("ctaSecondary")}</Link>
          </Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-3 max-w-3xl text-left pt-8">
          <Feature
            icon={<LayoutGrid className="h-5 w-5" />}
            title={t("feature1Title")}
            description={t("feature1Desc")}
          />
          <Feature
            icon={<MousePointerClick className="h-5 w-5" />}
            title={t("feature2Title")}
            description={t("feature2Desc")}
          />
          <Feature
            icon={<ShieldCheck className="h-5 w-5" />}
            title={t("feature3Title")}
            description={t("feature3Desc")}
          />
        </div>
      </div>
    </main>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
