-- ============================================================
-- EXECUTAR UMA ÚNICA VEZ no SQL Editor do Supabase.
-- Apaga apenas listas FECHADAS (Histórico) e os respetivos itens.
-- A lista atualmente aberta e os Produtos Habituais são mantidos.
-- ============================================================

begin;

delete from avo_listas
where estado = 'fechada';

commit;
