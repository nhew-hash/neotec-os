-- ============================================================================
-- FASE 264 — Segurança e automações (Fase A da auditoria 360°)
-- ADITIVA e reversível. NÃO aplicada em nenhum banco pelo assistente.
-- Ordem de aplicação: pode ser aplicada antes ou depois do deploy do código —
-- o código tolera a ausência das colunas (loga e segue), e a página pública de
-- proposta passou a usar service role (não depende mais da policy anônima).
-- ============================================================================

-- 1) Pedido de não contato por conversa --------------------------------------
alter table whatsapp_conversas add column if not exists nao_contatar boolean not null default false;
alter table whatsapp_conversas add column if not exists nao_contatar_em timestamptz;
create index if not exists idx_whatsapp_conversas_nao_contatar on whatsapp_conversas(telefone) where nao_contatar;

-- 2) prostec_propostas: remove acesso anônimo ------------------------------
-- A chave anon é pública (vai no navegador). Com estas policies, qualquer
-- pessoa podia LISTAR todas as propostas (valores, produto, empresa) e
-- ALTERAR qualquer uma pela API REST. A página /proposta/[token] agora lê
-- por service role filtrando pelo token (16 bytes aleatórios).
drop policy if exists "prostec_propostas_public_select" on prostec_propostas;
drop policy if exists "prostec_propostas_public_update_visualizacao" on prostec_propostas;

-- 3) loja_sessoes: remove UPDATE anônimo -----------------------------------
-- O rastreamento passa por /api/loja/track (service role); nenhum código usa
-- o client anônimo para atualizar sessões. `using (true)` deixava qualquer
-- visitante reescrever a atribuição (UTM/fbclid) de sessões alheias.
drop policy if exists "loja_sessoes_update_publico" on loja_sessoes;

notify pgrst, 'reload schema';

-- ROLLBACK (se necessário):
--   create policy "prostec_propostas_public_select" on prostec_propostas for select to anon using (true);
--   create policy "prostec_propostas_public_update_visualizacao" on prostec_propostas for update to anon using (true);
--   create policy "loja_sessoes_update_publico" on loja_sessoes for update to anon, authenticated using (true);
--   alter table whatsapp_conversas drop column nao_contatar, drop column nao_contatar_em;
