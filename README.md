# TeamFlow

> チーム向けのリアルタイム協調型タスク管理 SaaS。Linear / Notion / Asana の機能を **Next.js + Supabase + TypeScript** で実装したミニ版です。

🔗 **デモ**: [https://team-frow.vercel.app/]

新規登録するとデフォルトワークスペースが自動作成されてすぐ使えます (メール認証 OFF 設定済み)。

---

## ✨ 特徴

- 🏢 **マルチワークスペース** — 複数チームに所属、招待リンクでメンバー追加
- 🔐 **3 段階ロール** — Owner / Admin / Member の権限制御、最後のオーナーは退出不可
- 📋 **カンバンボード** — ドラッグ&ドロップで Todo / In Progress / Done を移動
- ⚡ **リアルタイム同期** — 他のメンバーの編集 (タスク・コメント・通知) が即座に画面に反映
- 👥 **プレゼンス表示** — 「今ボードを見ているメンバー」をアバターで可視化
- 💬 **コメント + @メンション** — Markdown 対応、メンション通知付き
- 🔔 **通知センター** — 未読バッジ、ベルアイコンから一覧、Realtime で即時更新
- 🌗 **ダークモード** — アカウントごとに保存 (他端末にも追従)、公開ページは light 固定
- 🌐 **多言語対応** — 日本語 / 英語 切替 (Supabase のエラーメッセージも翻訳)
- 📱 **モバイル最適化** — dvh / safe-area / theme-color / iOS 自動ズーム抑制、PWA 化への準備済み
- 🛡️ **Row Level Security** — DB レベルで多テナント分離
- 🪟 **統一された UX モーダル** — ConfirmDialog / ProfileDialog で native confirm 非依存

---

## 🛠️ 技術スタック

| カテゴリ | 採用技術 |
|---|---|
| フレームワーク | Next.js 15 (App Router, Server Actions, Server Components) |
| 言語 | TypeScript |
| DB / 認証 / Realtime | Supabase (Postgres + Auth + Realtime) |
| スタイリング | Tailwind CSS + shadcn/ui (Radix Primitives) |
| ドラッグ&ドロップ | dnd-kit |
| Markdown | react-markdown + remark-gfm |
| 日付 | date-fns + react-day-picker |
| 国際化 | next-intl (Cookie ベース) |
| デプロイ | Vercel |

---

## 📸 スクリーンショット

| カンバンボード | タスク詳細 (Markdown + 担当者 + ラベル + コメント) |
|---|---|
| ![board](docs/screenshots/board.png) | ![task-detail](docs/screenshots/task-detail.png) |

| メンバー管理 + 招待リンク | 通知センター |
|---|---|
| ![members](docs/screenshots/members.png) | ![notifications](docs/screenshots/notifications.png) |

---

## 🏃 ローカル開発

### 1. 依存インストール

```bash
npm install
```

### 2. Supabase プロジェクト準備

1. [supabase.com](https://supabase.com/) で新規プロジェクトを作成
2. **SQL Editor** で [supabase/schema.sql](supabase/schema.sql) を Run (テーブル + RLS + Realtime まで一発で構築)
3. **Authentication** → **Sign In / Up** → **Email** → `Confirm email` を **OFF** (開発時のみ)
4. **Authentication** → **URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/**`
5. **Settings** → **API** から **Project URL** と **anon key** を取得

### 3. 環境変数

```bash
cp .env.local.example .env.local
```

`.env.local` を編集:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### 4. 起動

```bash
npm run dev
```

`http://localhost:3000` を開いて新規登録から開始。

---

## 📁 主要ディレクトリ

```
src/
├── app/
│   ├── (landing/login/signup)             ランディング・認証ページ (light 固定)
│   ├── auth/callback                      メール認証コールバック
│   ├── invite/[token]                     招待リンク受諾ページ
│   ├── actions/                           Server Actions (theme, profile)
│   └── workspaces/
│       ├── page.tsx                       ワークスペース一覧
│       └── [slug]/
│           ├── page.tsx                   ダッシュボード (プロジェクト一覧)
│           ├── members/                   メンバー管理・招待
│           ├── labels/                    ラベル管理
│           └── projects/[id]/
│               ├── page.tsx               カンバンページ
│               ├── board.tsx              カンバン + Realtime + Presence
│               ├── task-detail.tsx        タスク詳細モーダル
│               └── comments.tsx           コメント + @メンション
├── components/
│   ├── ui/                                shadcn/ui プリミティブ
│   ├── app-header.tsx                     ヘッダー
│   ├── user-menu.tsx                      avatar dropdown (profile / theme / logout)
│   ├── profile-dialog.tsx                 プロフィール表示 / 編集モーダル
│   ├── confirm-dialog.tsx                 汎用確認モーダル
│   ├── notification-bell.tsx              通知ベル
│   └── workspace-switcher.tsx             ワークスペース切替
├── lib/
│   ├── supabase/                          ブラウザ/サーバー/ミドルウェア用クライアント + Database 型
│   ├── theme.ts / sync-theme.ts           テーマ管理 (cookie + DB 同期)
│   ├── workspace.ts                       requireWorkspace ヘルパー (RLS + アクセス制御)
│   ├── labels.ts / due-date.ts            ドメインロジック
│   └── translate-error.ts                 エラーメッセージの多言語化
├── i18n/                                  next-intl 設定
└── middleware.ts                          Supabase セッション + 認証ガード + ルート種別検出

supabase/
└── schema.sql                             DB スキーマ + RLS + RPC + Realtime publication (新規プロジェクト一発構築)

messages/
├── ja.json                                日本語翻訳
└── en.json                                英語翻訳
```

---

## 🏗️ アーキテクチャの要点

### Row Level Security でデータ漏洩を多重防御

すべてのテーブルに RLS を設定し、「自分が所属するワークスペースのデータしか触れない」を **DB レベルで強制**。アプリのバグや SQL インジェクションがあってもデータが漏れない設計。

### SECURITY DEFINER で RLS の再帰回避

`workspace_members` を参照する RLS で再帰しないよう、`is_workspace_member()` を SECURITY DEFINER 関数で抽象化。

### 権限設計は「制限よりも透明性」

Owner / Admin / Member の 3 ロールを設けつつ、Member でもタスク・プロジェクト・ラベルは作成・編集・削除すべて可能としている。Linear や Asana 等のモダンな協業ツールと同じ思想で、フラットなチームでは細かい権限制限より「全員が手早く調整できる」方がスピードを上げると判断した。

代わりに透明性で抑止する設計に振っている:

- **Realtime で変更が即座に見える** ため、勝手な削除も即バレる
- **通知センター** で担当者割当やコメント等の操作履歴が残る
- **取り返しのつかない操作** (workspace 削除、role 変更) のみ Owner / Admin に制限し、ConfirmDialog で二重ガード
- 最後の Owner は退出・削除できないよう `countOwners` で整合性チェック

### 招待リンク = ランダムトークン + RPC

未認証ユーザーでも招待画面を表示できるよう、招待情報の閲覧は SECURITY DEFINER の RPC `invitation_info(token)` 経由。トークンは 192 bit のランダム値。

### Realtime + Presence で多人数同時編集

Supabase Realtime (Postgres 論理レプリケーション) でタスク・コメント・通知の変更を全クライアントに配信。Presence でボードを見ているユーザーをアバター表示。DELETE event の filter 評価のため `REPLICA IDENTITY FULL` を設定済み。

### i18n は UI のみ翻訳、ユーザー入力は原文保持

Linear / Notion 等の業界標準に倣い、UI ラベルのみ翻訳。ユーザーが書いたタスク名やコメントは原文のまま (意図を改変しない)。エラーメッセージも辞書化して Supabase の英文も和訳。

### モバイル最適化 (アプリ化準備)

- `100vh` ではなく **`100dvh`** で URL バー伸縮を考慮した実効ビューポート
- iPhone のノッチ / Dynamic Island は **`env(safe-area-inset-*)`** で安全に避ける
- **`themeColor`** でモバイルブラウザのアドレスバー色を制御
- input の font-size を 16px 以上に強制して **iOS Safari の自動ズーム抑制**
- ダイアログはモバイルで中央配置 + 左右余白、`ease-out-expo` の滑らかなアニメーション
- 将来の PWA / Capacitor 化への足場を Web 層で固めている

### テーマは per-account 保存 + 公開ルートは light 固定

`profiles.theme` に保存しつつ、同端末は cookie をキャッシュ。ログイン時に DB → cookie 同期するため、別端末でログインしてもテーマが追従する。middleware が `x-is-public-route` ヘッダーを付与し、ランディング / ログイン / 招待 等の公開ルートは強制 light に。dark mode 時は `color-scheme: dark` で `<select>` 等 native UI もテーマに追従。

### Workspace の URL slug は UUID prefix 方式

最初は名前由来 slug (`/workspaces/marketing-team`) で実装していたが、日本語名で fallback (`workspace`) → 名前衝突で `-2`, `-3` ... と suffix が累積する問題、ワークスペース rename で URL が壊れる問題があった。`gen_random_uuid()` の先頭 8 桁を slug として固定する方式に切り替え、これらを一気に解決。

### 認証フローの SECURITY DEFINER RPC

`@supabase/ssr` の cookie セッションが PostgREST に伝搬しない既知の挙動に対し、ワークスペース作成のような原子操作は **SECURITY DEFINER 関数 (`create_workspace_for_user`)** で安全に実装。関数内で `auth.uid()` を直接読んで認証チェック後、RLS をバイパスして workspaces + workspace_members を atomic に作成。

### 汎用 ConfirmDialog で UX 統一

ログアウト確認 / ワークスペース削除確認 等を共通の `ConfirmDialog` で実装。native `confirm()` 非依存で、destructive variant 対応、Tailwind アニメーション統一。

---

## 🗺️ 開発フェーズ

このプロジェクトは段階的に構築されました:

| Phase | 内容 |
|---|---|
| Phase 1 | ワークスペース / メンバー / 招待 / ロール権限 |
| Phase 2 | タスク詳細モーダル (Markdown / 担当者 / 期限 / ラベル) |
| Phase 3 | Realtime 同期 + Presence + i18n (日本語/英語) |
| Phase 4 | コメント + @メンション + 通知センター |
| Phase 5 | モバイル最適化 (dvh / safe-area / theme-color) + Vercel デプロイ |
| Phase 6 | UserMenu / ProfileDialog / ConfirmDialog で UX 統一 |
| Phase 7 | per-account ダークモード + 公開ルート light 固定 |
| Phase 8 | Workspace slug を UUID prefix 方式へ refactor |

---

## 🔮 今後の改善案

- アクティビティフィード (誰がいつ何をしたか)
- ファイル添付 (Supabase Storage)
- E2E テスト (Playwright)
- OAuth (Google / GitHub)
- メール通知 (Resend 等)
- PWA 化 (manifest + Service Worker、モバイル最適化済みなので足場は完成)
- 絵文字リアクション、コメント編集
- デモ用シードデータの自動投入

---

## 📜 ライセンス

ポートフォリオ目的。商用利用想定なし。
