-- ============================================================
--  Lista da Avó — Schema Supabase (projeto dedicado wppvcquqgrjbooftfvuy)
--  Aditivo e isolado: não toca em nenhuma tabela existente.
-- ============================================================

create table if not exists avo_familias (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  codigo     text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists avo_listas (
  id          uuid primary key default gen_random_uuid(),
  familia_id  uuid not null references avo_familias(id) on delete cascade,
  data        date not null default current_date,
  estado      text not null default 'aberta' check (estado in ('aberta','fechada')),
  created_at  timestamptz not null default now(),
  fechada_at  timestamptz
);

create table if not exists avo_itens (
  id             uuid primary key default gen_random_uuid(),
  lista_id       uuid not null references avo_listas(id) on delete cascade,
  familia_id     uuid not null references avo_familias(id) on delete cascade,
  nome           text not null,
  quantidade     int  not null default 1,
  categoria      text not null default 'outros',
  imagem_url     text,
  marca          text,
  comprado       boolean not null default false,
  adicionado_por text,
  created_at     timestamptz not null default now(),
  comprado_at    timestamptz
);

create table if not exists avo_habituais (
  id         uuid primary key default gen_random_uuid(),
  familia_id uuid not null references avo_familias(id) on delete cascade,
  nome       text not null,
  categoria  text not null default 'outros',
  created_at timestamptz not null default now(),
  unique (familia_id, nome)
);

create index if not exists idx_avo_listas_familia   on avo_listas(familia_id, estado);
create index if not exists idx_avo_itens_lista       on avo_itens(lista_id);
create index if not exists idx_avo_itens_familia     on avo_itens(familia_id);
create index if not exists idx_avo_habituais_familia on avo_habituais(familia_id);

-- ---------- FUNÇÕES (entrar / criar família) ----------
create or replace function avo_criar_familia(p_nome text, p_codigo text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  insert into avo_familias (nome, codigo) values (trim(p_nome), upper(trim(p_codigo)))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function avo_entrar_familia(p_codigo text)
returns uuid language sql security definer set search_path = public
as $$
  select id from avo_familias where codigo = upper(trim(p_codigo)) limit 1;
$$;

-- ---------- SEGURANÇA (RLS) ----------
alter table avo_familias  enable row level security;
alter table avo_listas    enable row level security;
alter table avo_itens     enable row level security;
alter table avo_habituais enable row level security;

-- avo_familias sem policies para anon -> códigos não enumeráveis.

drop policy if exists p_avo_listas_all on avo_listas;
create policy p_avo_listas_all on avo_listas for all to anon, authenticated using (true) with check (true);

drop policy if exists p_avo_itens_all on avo_itens;
create policy p_avo_itens_all on avo_itens for all to anon, authenticated using (true) with check (true);

drop policy if exists p_avo_habituais_all on avo_habituais;
create policy p_avo_habituais_all on avo_habituais for all to anon, authenticated using (true) with check (true);

grant execute on function avo_criar_familia(text, text) to anon, authenticated;
grant execute on function avo_entrar_familia(text)       to anon, authenticated;

-- ---------- REALTIME ----------
alter publication supabase_realtime add table avo_itens;
alter publication supabase_realtime add table avo_listas;
