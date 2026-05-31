-- TeamFlow schema (Supabase SQL Editor で実行)
-- Phase 1: workspaces / members / invitations

-- ============================================================
-- リセット (既存テーブルを全部削除)
-- ============================================================
drop trigger if exists on_auth_user_created on auth.users;
drop table if exists public.notifications cascade;
drop table if exists public.task_comments cascade;
drop table if exists public.task_labels cascade;
drop table if exists public.labels cascade;
drop table if exists public.tasks cascade;
drop table if exists public.projects cascade;
drop table if exists public.workspace_invitations cascade;
drop table if exists public.workspace_members cascade;
drop table if exists public.workspaces cascade;
drop table if exists public.profiles cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.accept_invitation(text) cascade;
drop function if exists public.invitation_info(text) cascade;
drop function if exists public.is_workspace_member(uuid) cascade;
drop function if exists public.workspace_role_of(uuid) cascade;
drop function if exists public.is_workspace_admin(uuid) cascade;
drop type if exists task_status cascade;
drop type if exists workspace_role cascade;

-- ============================================================
-- 拡張 / enum
-- ============================================================
create extension if not exists "pgcrypto";

create type task_status as enum ('todo', 'in_progress', 'done');
create type workspace_role as enum ('owner', 'admin', 'member');

-- ============================================================
-- profiles
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- workspaces
-- ============================================================
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create index workspaces_slug_idx on public.workspaces(slug);

-- ============================================================
-- workspace_members
-- ============================================================
create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role workspace_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_idx on public.workspace_members(user_id);

-- ============================================================
-- workspace_invitations
-- ============================================================
create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text,                     -- メモ用 (任意)。token があれば誰でも踏める
  role workspace_role not null default 'member',
  token text not null unique default translate(encode(gen_random_bytes(24), 'base64'), '+/=', '-_'),
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index workspace_invitations_workspace_idx on public.workspace_invitations(workspace_id);
create index workspace_invitations_token_idx on public.workspace_invitations(token);

-- ============================================================
-- projects
-- ============================================================
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index projects_workspace_idx on public.projects(workspace_id);

-- ============================================================
-- tasks
-- ============================================================
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status task_status not null default 'todo',
  position integer not null default 0,
  assignee_id uuid references auth.users(id) on delete set null,
  due_date date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index tasks_project_idx on public.tasks(project_id);
create index tasks_status_idx on public.tasks(project_id, status, position);
create index tasks_assignee_idx on public.tasks(assignee_id);

-- DELETE event の filter (project_id) を評価できるよう OLD 行に全カラム残す
alter table public.tasks replica identity full;

-- ============================================================
-- labels (ワークスペーススコープ)
-- ============================================================
create table public.labels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  color text not null default 'slate',
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create index labels_workspace_idx on public.labels(workspace_id);

create table public.task_labels (
  task_id uuid not null references public.tasks(id) on delete cascade,
  label_id uuid not null references public.labels(id) on delete cascade,
  primary key (task_id, label_id)
);

create index task_labels_label_idx on public.task_labels(label_id);

-- ============================================================
-- task_comments (タスクのコメント)
-- ============================================================
create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index task_comments_task_idx on public.task_comments(task_id, created_at);

-- DELETE event の filter (task_id) を評価できるよう OLD 行に全カラム残す
alter table public.task_comments replica identity full;

-- ============================================================
-- notifications (受信者ごとの通知)
-- ============================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('mentioned', 'assigned', 'commented')),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  comment_id uuid references public.task_comments(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_unread_idx
  on public.notifications(user_id, created_at desc)
  where read_at is null;
create index notifications_user_idx on public.notifications(user_id, created_at desc);

-- DELETE event の filter を評価できるよう OLD 行に全カラム残す
alter table public.notifications replica identity full;

-- ============================================================
-- ヘルパー関数 (security definer で RLS 再帰を回避)
-- ============================================================
create or replace function public.is_workspace_member(_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = _workspace and user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_admin(_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = _workspace
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

create or replace function public.workspace_role_of(_workspace uuid)
returns workspace_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.workspace_members
  where workspace_id = _workspace and user_id = auth.uid();
$$;

-- ============================================================
-- 新規ユーザー作成時に profile + デフォルトワークスペースを生成
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _name text;
  _base_slug text;
  _slug text;
  _workspace_id uuid;
  _suffix int;
begin
  _name := coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1));

  insert into public.profiles (id, display_name) values (new.id, _name);

  _base_slug := lower(regexp_replace(coalesce(_name, 'workspace'), '[^a-zA-Z0-9]+', '-', 'g'));
  _base_slug := trim(both '-' from _base_slug);
  if _base_slug = '' then _base_slug := 'workspace'; end if;
  _slug := _base_slug;
  _suffix := 1;
  while exists (select 1 from public.workspaces where slug = _slug) loop
    _suffix := _suffix + 1;
    _slug := _base_slug || '-' || _suffix;
  end loop;

  insert into public.workspaces (name, slug)
  values (_name || 'のワークスペース', _slug)
  returning id into _workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (_workspace_id, new.id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 招待関連 RPC (token はランダムなので RLS と別経路で読む)
-- ============================================================
create or replace function public.invitation_info(_token text)
returns table (
  workspace_id uuid,
  workspace_name text,
  workspace_slug text,
  role workspace_role,
  expires_at timestamptz,
  accepted_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select w.id, w.name, w.slug, i.role, i.expires_at, i.accepted_at
  from public.workspace_invitations i
  join public.workspaces w on w.id = i.workspace_id
  where i.token = _token;
$$;

create or replace function public.accept_invitation(_token text)
returns table (workspace_slug text)
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  ws_slug text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select i.*, w.slug as slug
  into inv
  from public.workspace_invitations i
  join public.workspaces w on w.id = i.workspace_id
  where i.token = _token
  for update;

  if not found then
    raise exception 'invitation_not_found';
  end if;
  if inv.accepted_at is not null then
    -- 既に受諾済みなら、その時点で既にメンバーのはず。ワークスペースへ案内するだけ。
    ws_slug := inv.slug;
  elsif inv.expires_at < now() then
    raise exception 'invitation_expired';
  else
    insert into public.workspace_members (workspace_id, user_id, role)
    values (inv.workspace_id, auth.uid(), inv.role)
    on conflict (workspace_id, user_id) do nothing;

    update public.workspace_invitations
    set accepted_at = now()
    where id = inv.id;

    ws_slug := inv.slug;
  end if;

  return query select ws_slug;
end;
$$;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.labels enable row level security;
alter table public.task_labels enable row level security;
alter table public.task_comments enable row level security;
alter table public.notifications enable row level security;

-- profiles
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
  on public.profiles for select using (true);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update using (auth.uid() = id);

-- workspaces
drop policy if exists "workspaces_select_members" on public.workspaces;
create policy "workspaces_select_members"
  on public.workspaces for select
  using (public.is_workspace_member(id));

drop policy if exists "workspaces_insert_auth" on public.workspaces;
create policy "workspaces_insert_auth"
  on public.workspaces for insert
  with check (auth.uid() is not null);

drop policy if exists "workspaces_update_admin" on public.workspaces;
create policy "workspaces_update_admin"
  on public.workspaces for update
  using (public.is_workspace_admin(id));

drop policy if exists "workspaces_delete_owner" on public.workspaces;
create policy "workspaces_delete_owner"
  on public.workspaces for delete
  using (public.workspace_role_of(id) = 'owner');

-- workspace_members
drop policy if exists "wm_select_same_workspace" on public.workspace_members;
create policy "wm_select_same_workspace"
  on public.workspace_members for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists "wm_insert_self_or_admin" on public.workspace_members;
create policy "wm_insert_self_or_admin"
  on public.workspace_members for insert
  with check (
    auth.uid() = user_id  -- 自分を追加 (例: 新規ワークスペース作成時のオーナー追加)
    or public.is_workspace_admin(workspace_id)
  );

drop policy if exists "wm_update_owner" on public.workspace_members;
create policy "wm_update_owner"
  on public.workspace_members for update
  using (public.workspace_role_of(workspace_id) = 'owner');

drop policy if exists "wm_delete_self_or_owner" on public.workspace_members;
create policy "wm_delete_self_or_owner"
  on public.workspace_members for delete
  using (
    auth.uid() = user_id  -- 自分を抜く
    or public.workspace_role_of(workspace_id) = 'owner'
  );

-- workspace_invitations (RLS 上は admin/owner のみ。token 経路は RPC でアクセス)
drop policy if exists "wi_admin_all" on public.workspace_invitations;
create policy "wi_admin_all"
  on public.workspace_invitations for all
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

-- projects: ワークスペースメンバーは全権
drop policy if exists "projects_member_all" on public.projects;
create policy "projects_member_all"
  on public.projects for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- tasks: 所属プロジェクトのワークスペースメンバーは全権
drop policy if exists "tasks_member_all" on public.tasks;
create policy "tasks_member_all"
  on public.tasks for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = tasks.project_id and public.is_workspace_member(p.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = tasks.project_id and public.is_workspace_member(p.workspace_id)
    )
  );

-- labels: ワークスペースメンバーは全権
drop policy if exists "labels_member_all" on public.labels;
create policy "labels_member_all"
  on public.labels for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- task_labels: 所属プロジェクトのワークスペースメンバーは全権
drop policy if exists "task_labels_member_all" on public.task_labels;
create policy "task_labels_member_all"
  on public.task_labels for all
  using (
    exists (
      select 1 from public.tasks t
      join public.projects p on p.id = t.project_id
      where t.id = task_labels.task_id and public.is_workspace_member(p.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      join public.projects p on p.id = t.project_id
      where t.id = task_labels.task_id and public.is_workspace_member(p.workspace_id)
    )
  );

-- task_comments: 所属プロジェクトのワークスペースメンバーは全権、削除は本人のみ
drop policy if exists "task_comments_select_member" on public.task_comments;
create policy "task_comments_select_member"
  on public.task_comments for select
  using (
    exists (
      select 1 from public.tasks t
      join public.projects p on p.id = t.project_id
      where t.id = task_comments.task_id and public.is_workspace_member(p.workspace_id)
    )
  );

drop policy if exists "task_comments_insert_member" on public.task_comments;
create policy "task_comments_insert_member"
  on public.task_comments for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.tasks t
      join public.projects p on p.id = t.project_id
      where t.id = task_comments.task_id and public.is_workspace_member(p.workspace_id)
    )
  );

drop policy if exists "task_comments_delete_self" on public.task_comments;
create policy "task_comments_delete_self"
  on public.task_comments for delete
  using (auth.uid() = user_id);

-- notifications: 自分宛のものを参照/更新/削除。挿入は同じ workspace のメンバーが行える
drop policy if exists "notifications_select_self" on public.notifications;
create policy "notifications_select_self"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "notifications_insert_workspace_member" on public.notifications;
create policy "notifications_insert_workspace_member"
  on public.notifications for insert
  with check (
    workspace_id is not null
    and public.is_workspace_member(workspace_id)
    and exists (
      select 1 from public.workspace_members
      where workspace_id = notifications.workspace_id
        and user_id = notifications.user_id
    )
  );

drop policy if exists "notifications_update_self" on public.notifications;
create policy "notifications_update_self"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "notifications_delete_self" on public.notifications;
create policy "notifications_delete_self"
  on public.notifications for delete
  using (auth.uid() = user_id);

-- ============================================================
-- Realtime: tasks, task_comments, notifications を購読可能に
-- ============================================================
do $$ begin
  alter publication supabase_realtime add table public.tasks;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.task_comments;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;
