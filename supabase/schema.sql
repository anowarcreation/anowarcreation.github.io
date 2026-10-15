-- Starter schema for a secure Anowar Creation exam backend.
-- Review and deploy only after understanding the RLS policies.
create extension if not exists pgcrypto;

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','exam_manager')),
  created_at timestamptz not null default now()
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null default 'Biology',
  exam_code_hash text not null,
  duration_minutes int not null default 30 check (duration_minutes > 0),
  positive_marks numeric not null default 4,
  negative_marks numeric not null default 1,
  pass_percentage numeric not null default 40 check (pass_percentage between 0 and 100),
  is_published boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  chapter text not null,
  question_text text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4),
  correct_option smallint not null check (correct_option between 0 and 3),
  explanation text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete restrict,
  student_name text not null,
  roll_number text not null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress','submitted','expired')),
  score numeric,
  correct_count int,
  wrong_count int,
  unanswered_count int,
  certificate_no text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.attempt_answers (
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  selected_option smallint check (selected_option between 0 and 3),
  primary key (attempt_id, question_id)
);

create table if not exists public.certificates (
  certificate_no text primary key,
  attempt_id uuid not null unique references public.attempts(id) on delete cascade,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table public.admin_profiles enable row level security;
alter table public.exams enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.certificates enable row level security;

-- Default deny: no public policies are created here.
-- Add policies only after the Edge Functions are implemented.
-- Student browser must NEVER select correct_option or explanations before submission.
-- Prefer Edge Functions that return question text/options only and score submissions server-side.
-- Admin reads/writes should require authenticated users whose admin_profiles.role is authorized.
-- Do not place the Supabase service_role key in any HTML/JS file.
