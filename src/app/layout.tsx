import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { FloatingLanguageSwitcher } from "@/components/floating-language-switcher";
import { THEME_COOKIE } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "TeamFlow",
  description: "Team task & project management",
  applicationName: "TeamFlow",
  appleWebApp: {
    capable: true,
    title: "TeamFlow",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // ピンチでのズームは許可するが、input フォーカス時の意図しないズームを防ぐ
  // (各 input 側の font-size を 16px 以上にすることで Safari の自動ズームを抑制)
  maximumScale: 5,
  viewportFit: "cover",
  // キーボード表示時にレイアウトビューポートを縮める (fixed/sticky 要素も自動的に上に動く)
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const cookieStore = await cookies();
  const headerStore = await headers();

  // ランディング / ログイン / サインアップ / 招待ページなど公開ルートは常に light で固定。
  // テーマ切替は workspaces 配下のログイン後ページのみ反映される。
  const isPublicRoute = headerStore.get("x-is-public-route") === "1";
  const savedTheme = cookieStore.get(THEME_COOKIE)?.value === "dark" ? "dark" : "light";
  const theme = isPublicRoute ? "light" : savedTheme;

  return (
    <html lang={locale} className={theme === "dark" ? "dark" : undefined}>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <FloatingLanguageSwitcher />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
