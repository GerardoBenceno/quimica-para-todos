-- =====================================================================
-- Química para Todos — Esquema PostgreSQL para Supabase (MVP 2)
-- Modelo content-driven con auth anónima y RLS.
-- Aplicar en Supabase SQL Editor. Requiere extensión pgcrypto (uuid).
-- Convención: contenido es público de lectura; datos de usuario son privados.
-- =====================================================================

create extension if not exists "pgcrypto";

-- =========================== ENUMS ===================================
do $$ begin
  create type world_status as enum ('unlocked','locked','coming_soon');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lesson_type as enum ('standard','timed_challenge','practice','diagnostic');
exception when duplicate_object then null; end $$;

do $$ begin
  create type exercise_type as enum ('multiple_choice','fill_blanks','identify_group','true_false','chat_complete','diagnostic');
exception when duplicate_object then null; end $$;

do $$ begin
  create type progress_status as enum ('locked','available','in_progress','completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type scope_type as enum ('world','unit','lesson');
exception when duplicate_object then null; end $$;

do $$ begin
  create type reward_type as enum ('xp','coins','chest','streak_freeze','cosmetic');
exception when duplicate_object then null; end $$;

do $$ begin
  create type asset_kind as enum ('image','sprite','structure','video','icon','lottie');
exception when duplicate_object then null; end $$;

-- ===================== CONTENIDO (lectura pública) ===================

create table if not exists content_versions (
  id            text primary key,
  version       integer not null,
  channel       text not null default 'stable',
  notes         text,
  min_app_version text,
  created_at    timestamptz not null default now()
);

create table if not exists worlds (
  id            text primary key,
  slug          text unique not null,
  title_key     text not null,
  description_key text,
  icon_asset_id text,
  "order"       integer not null,
  status        world_status not null default 'locked',
  unlock_rule   jsonb,
  total_lessons integer not null default 0,
  content_version integer not null default 1,
  is_active     boolean not null default true
);

create table if not exists units (
  id            text primary key,
  world_id      text not null references worlds(id),
  title_key     text not null,
  subtitle_key  text,
  "order"       integer not null,
  unlock_rule   jsonb,
  content_version integer not null default 1,
  is_active     boolean not null default true
);
create index if not exists idx_units_world on units(world_id);

create table if not exists lessons (
  id            text primary key,
  unit_id       text not null references units(id),
  title_key     text not null,
  "order"       integer not null,
  type          lesson_type not null default 'standard',
  intro         jsonb,          -- {text_key, image_asset_id, youtube_id}
  xp_reward     integer not null default 0,
  coin_reward   integer not null default 0,
  star_count    integer not null default 0,
  unlock_rule   jsonb,
  content_version integer not null default 1,
  is_active     boolean not null default true
);
create index if not exists idx_lessons_unit on lessons(unit_id);

create table if not exists exercises (
  id            text primary key,
  lesson_id     text references lessons(id),   -- null = banco reutilizable / diagnóstico
  type          exercise_type not null,
  prompt_key    text not null,
  payload       jsonb,          -- opciones, plantilla, estructura según tipo
  correct       jsonb not null, -- respuesta(s) correcta(s)
  explanation_key text,
  feedback_template_id text,
  difficulty    integer not null default 1,
  xp            integer not null default 10,
  coins         integer not null default 1,
  topic         text,
  prerequisites jsonb default '[]'::jsonb,
  structure_asset_id text,
  smiles        text,
  is_diagnostic boolean not null default false,
  weight        integer,        -- solo diagnóstico
  maps_to_world text,           -- solo diagnóstico
  content_version integer not null default 1,
  is_active     boolean not null default true
);
create index if not exists idx_exercises_lesson on exercises(lesson_id);
create index if not exists idx_exercises_topic on exercises(topic);
create index if not exists idx_exercises_diag on exercises(is_diagnostic) where is_diagnostic;

-- opciones normalizadas (opcional; en MVP las opciones viven en exercises.payload)
create table if not exists exercise_options (
  id            text primary key,
  exercise_id   text not null references exercises(id),
  label_key     text not null,
  value         text,
  is_correct    boolean not null default false,
  "order"       integer not null default 0
);
create index if not exists idx_exoptions_ex on exercise_options(exercise_id);

create table if not exists feedback_templates (
  id            text primary key,
  key           text not null,
  topic         text,
  message_key   text not null,
  hint_key      text,
  severity      text not null default 'correction',
  content_version integer not null default 1,
  is_active     boolean not null default true
);

create table if not exists translations (
  id            bigserial primary key,
  key           text not null,
  locale        text not null,
  value         text not null,
  content_version integer not null default 1,
  unique(key, locale)
);
create index if not exists idx_translations_locale on translations(locale);

create table if not exists themes (
  id            text primary key,
  name          text not null,
  colors        jsonb not null,
  typography    jsonb,
  is_default    boolean not null default false,
  content_version integer not null default 1,
  is_active     boolean not null default true
);

create table if not exists characters (
  id            text primary key,
  name_key      text not null,
  role          text not null default 'mascot',
  sprite_asset_id text,
  expressions   jsonb,
  content_version integer not null default 1,
  is_active     boolean not null default true
);

create table if not exists assets (
  id            text primary key,
  kind          asset_kind not null,
  uri           text not null,
  locale        text,
  width         integer,
  height        integer,
  alt_key       text,
  license       text,
  content_version integer not null default 1,
  is_active     boolean not null default true
);

create table if not exists currencies (
  id            text primary key,
  code          text unique not null,
  name_key      text not null,
  icon_asset_id text
);

create table if not exists rewards (
  id            text primary key,
  type          reward_type not null,
  value         integer not null default 0,
  title_key     text,
  icon_asset_id text,
  trigger       jsonb,
  content_version integer not null default 1,
  is_active     boolean not null default true
);

create table if not exists app_config (
  id            text primary key,
  key           text unique not null,
  value         jsonb not null,
  description   text,
  updated_at    timestamptz not null default now()
);

-- ===================== DATOS DE USUARIO (privados) ===================

-- perfil del usuario; id = auth.uid() de Supabase (auth anónima u opcional)
create table if not exists users (
  id            uuid primary key references auth.users(id) on delete cascade,
  is_anonymous  boolean not null default true,
  display_name  text,
  locale        text not null default 'es',
  theme_id      text references themes(id),
  coins         integer not null default 0,
  xp_total      integer not null default 0,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  recommended_world_id text references worlds(id),
  email         text,
  auth_provider text,
  avatar_character_id text references characters(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists user_progress (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  scope_type    scope_type not null,
  scope_id      text not null,
  status        progress_status not null default 'available',
  progress      real not null default 0,
  stars         integer not null default 0,
  best_accuracy real,
  updated_at    timestamptz not null default now(),
  unique(user_id, scope_type, scope_id)
);
create index if not exists idx_progress_user on user_progress(user_id);

create table if not exists diagnostic_results (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  score         integer not null,
  level_label   text,
  recommended_world_id text references worlds(id),
  weak_topics   jsonb default '[]'::jsonb,
  answers       jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists idx_diag_user on diagnostic_results(user_id);

create table if not exists user_rewards (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  reward_id     text not null references rewards(id),
  source        text,
  obtained_at   timestamptz not null default now(),
  claimed       boolean not null default false
);
create index if not exists idx_user_rewards_user on user_rewards(user_id);

create table if not exists streaks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  last_active_date date,
  count         integer not null default 0,
  freezes_used  integer not null default 0,
  updated_at    timestamptz not null default now(),
  unique(user_id)
);

create table if not exists mistakes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  exercise_id   text not null references exercises(id),
  topic         text,
  count         integer not null default 1,
  last_failed_at timestamptz not null default now(),
  resolved      boolean not null default false,
  unique(user_id, exercise_id)
);
create index if not exists idx_mistakes_user on mistakes(user_id);

create table if not exists lesson_attempts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  lesson_id     text not null references lessons(id),
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  accuracy      real,
  xp_earned     integer not null default 0,
  coins_earned  integer not null default 0,
  stars         integer not null default 0,
  duration_seconds integer,
  completed     boolean not null default false
);
create index if not exists idx_lesson_attempts_user on lesson_attempts(user_id);

create table if not exists exercise_attempts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  exercise_id   text not null references exercises(id),
  lesson_attempt_id uuid references lesson_attempts(id) on delete set null,
  given_answer  jsonb,
  is_correct    boolean not null,
  time_ms       integer,
  created_at    timestamptz not null default now()
);
create index if not exists idx_ex_attempts_user on exercise_attempts(user_id);

-- =========================== RLS ====================================
-- Contenido: lectura pública (anon + authenticated), escritura solo service_role.
-- Datos de usuario: cada quien ve y escribe SOLO sus filas (user_id = auth.uid()).

-- contenido público de lectura
do $$
declare tbl text;
begin
  foreach tbl in array array['worlds','units','lessons','exercises','exercise_options',
    'feedback_templates','translations','themes','characters','assets','currencies',
    'rewards','app_config','content_versions']
  loop
    execute format('alter table %I enable row level security;', tbl);
    execute format($f$
      do $inner$ begin
        create policy "%1$s_read" on %1$I for select using (true);
      exception when duplicate_object then null; end $inner$;
    $f$, tbl);
  end loop;
end $$;

-- datos de usuario: dueño únicamente
do $$
declare tbl text;
begin
  foreach tbl in array array['users','user_progress','diagnostic_results','user_rewards',
    'streaks','mistakes','lesson_attempts','exercise_attempts']
  loop
    execute format('alter table %I enable row level security;', tbl);
  end loop;
end $$;

-- users: la fila propia (id = auth.uid())
do $$ begin
  create policy "users_self_select" on users for select using (auth.uid() = id);
  create policy "users_self_insert" on users for insert with check (auth.uid() = id);
  create policy "users_self_update" on users for update using (auth.uid() = id);
exception when duplicate_object then null; end $$;

-- tablas con columna user_id
do $$
declare tbl text;
begin
  foreach tbl in array array['user_progress','diagnostic_results','user_rewards',
    'streaks','mistakes','lesson_attempts','exercise_attempts']
  loop
    execute format($f$
      do $inner$ begin
        create policy "%1$s_owner_select" on %1$I for select using (auth.uid() = user_id);
        create policy "%1$s_owner_insert" on %1$I for insert with check (auth.uid() = user_id);
        create policy "%1$s_owner_update" on %1$I for update using (auth.uid() = user_id);
        create policy "%1$s_owner_delete" on %1$I for delete using (auth.uid() = user_id);
      exception when duplicate_object then null; end $inner$;
    $f$, tbl);
  end loop;
end $$;

-- =========================== TRIGGER ================================
-- Crear fila en users automáticamente al registrarse (incluye auth anónima).
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, is_anonymous)
  values (new.id, coalesce((new.raw_app_meta_data->>'provider') is null, true))
  on conflict (id) do nothing;
  return new;
end $$;

do $$ begin
  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function handle_new_user();
exception when duplicate_object then null; end $$;

-- =====================================================================
-- Carga de contenido (seed): importar los JSON de seed/ vía script de
-- migración o subir por el dashboard. El contenido se inserta con
-- service_role (las políticas de lectura no bloquean inserts del backend).
-- =====================================================================
