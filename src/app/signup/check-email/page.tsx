import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MailCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const t = await getTranslations("checkEmail");

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <MailCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription>
            {email ? t("sentTo", { email }) : t("sentGeneric")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-5">
            <li>{t("step1")}</li>
            <li>{t("step2")}</li>
            <li>{t("step3")}</li>
            <li>{t("step4")}</li>
          </ol>
          <p className="text-xs text-muted-foreground mt-4">{t("spamHint")}</p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">{t("backToLogin")}</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
