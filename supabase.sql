-- ============================================================
--  Lista da Avó — Schema Supabase
--  Versão com proteção contra duplicados + habituais automáticos
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

create index if not exists idx_avo_listas_familia    on avo_listas(familia_id, estado);
create index if not exists idx_avo_itens_lista       on avo_itens(lista_id);
create index if not exists idx_avo_itens_familia     on avo_itens(familia_id);
create index if not exists idx_avo_habituais_familia on avo_habituais(familia_id);

-- Se uma versão antiga deixou duplicados, mantém apenas o registo mais antigo.
-- Isto permite criar os índices UNIQUE normalizados abaixo sem falhar.
with repetidos as (
  select id,
         row_number() over (
           partition by lista_id, lower(btrim(nome))
           order by created_at, id
         ) as rn
  from avo_itens
)
delete from avo_itens i
using repetidos r
where i.id=r.id and r.rn>1;

with repetidos as (
  select id,
         row_number() over (
           partition by familia_id, lower(btrim(nome))
           order by created_at, id
         ) as rn
  from avo_habituais
)
delete from avo_habituais h
using repetidos r
where h.id=r.id and r.rn>1;

-- Proteção real na BD: "Leite", " leite " e "LEITE" contam como o mesmo produto.
create unique index if not exists uq_avo_itens_lista_nome_norm
  on avo_itens (lista_id, lower(btrim(nome)));

create unique index if not exists uq_avo_habituais_familia_nome_norm
  on avo_habituais (familia_id, lower(btrim(nome)));

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

-- Um produto comprado em N listas fechadas diferentes passa automaticamente a habitual.
-- O frontend usa N=3, mas o valor fica configurável.
create or replace function avo_promover_habituais(p_familia_id uuid, p_min_compras int default 3)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inseridos integer := 0;
begin
  with frequentes as (
    select
      lower(btrim(i.nome)) as nome_norm,
      (array_agg(btrim(i.nome) order by coalesce(i.comprado_at,i.created_at) desc))[1] as nome,
      (array_agg(coalesce(i.categoria,'outros') order by coalesce(i.comprado_at,i.created_at) desc))[1] as categoria
    from avo_itens i
    join avo_listas l on l.id=i.lista_id
    where i.familia_id=p_familia_id
      and l.estado='fechada'
      and i.comprado=true
    group by lower(btrim(i.nome))
    having count(distinct i.lista_id) >= greatest(coalesce(p_min_compras,3),2)
  ), inseridos as (
    insert into avo_habituais (familia_id,nome,categoria)
    select p_familia_id, f.nome, f.categoria
    from frequentes f
    where not exists (
      select 1
      from avo_habituais h
      where h.familia_id=p_familia_id
        and lower(btrim(h.nome))=f.nome_norm
    )
    on conflict do nothing
    returning 1
  )
  select count(*) into v_inseridos from inseridos;

  return v_inseridos;
end;
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
grant execute on function avo_entrar_familia(text) to anon, authenticated;
grant execute on function avo_promover_habituais(uuid, integer) to anon, authenticated;

-- ---------- REALTIME (idempotente) ----------
do $$
begin
  alter publication supabase_realtime add table avo_itens;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table avo_listas;
exception when duplicate_object then null;
end $$;
