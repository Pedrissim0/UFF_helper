-- Schema completo — idempotente (pode rodar quantas vezes quiser)
-- Executar no SQL Editor do Supabase Dashboard

-- ══════════════════════════════════════════════════
-- Tabela principal de disciplinas
-- ══════════════════════════════════════════════════

create table if not exists disciplinas (
  id         bigint generated always as identity primary key,
  codigo     text    not null,
  nome       text    not null,
  turma      text    not null,
  ch         integer,
  link       text,
  horarios   jsonb   not null default '{}',
  docente    text,
  periodo    integer,
  tipo       text,
  prerequisitos jsonb not null default '[]',
  nome_exibicao text,
  updated_at timestamptz not null default now(),

  unique (codigo, turma)
);

create index if not exists disciplinas_codigo_idx on disciplinas (codigo);
create index if not exists disciplinas_tipo_idx   on disciplinas (tipo);
create index if not exists disciplinas_periodo_idx on disciplinas (periodo);

alter table disciplinas enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'disciplinas' and policyname = 'Leitura pública'
  ) then
    create policy "Leitura pública" on disciplinas for select using (true);
  end if;
end $$;

-- ══════════════════════════════════════════════════
-- Tabela de professores (crowdsourcing de emails)
-- ══════════════════════════════════════════════════

create table if not exists professors (
  id         uuid default gen_random_uuid() primary key,
  name       text not null unique,
  email      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists professors_name_idx on professors (name);

alter table professors enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'professors' and policyname = 'Leitura pública de professores'
  ) then
    create policy "Leitura pública de professores" on professors for select using (true);
  end if;
end $$;

-- ══════════════════════════════════════════════════
-- Tabela de submissões de email (crowdsourcing)
-- ══════════════════════════════════════════════════

create table if not exists email_submissions (
  id               uuid default gen_random_uuid() primary key,
  professor_id     uuid not null references professors(id) on delete cascade,
  email_submitted  text not null,
  ip               text not null,
  created_at       timestamptz not null default now(),

  unique (professor_id, ip)
);

create index if not exists email_submissions_professor_idx
  on email_submissions (professor_id);
create index if not exists email_submissions_consensus_idx
  on email_submissions (professor_id, email_submitted);

-- RLS: sem policy de select pública (contém IPs)
alter table email_submissions enable row level security;

-- ══════════════════════════════════════════════════
-- Trigger: validação por consenso (3 votos iguais)
-- ══════════════════════════════════════════════════

create or replace function check_email_consensus()
returns trigger as $$
declare
  matching_count int;
begin
  select count(*)
  into matching_count
  from email_submissions
  where professor_id = NEW.professor_id
    and email_submitted = NEW.email_submitted;

  if matching_count >= 3 then
    update professors
    set email = NEW.email_submitted,
        updated_at = now()
    where id = NEW.professor_id;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_check_email_consensus on email_submissions;
create trigger trg_check_email_consensus
  after insert or update on email_submissions
  for each row
  execute function check_email_consensus();
