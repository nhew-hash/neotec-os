-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 209 (Supabase / PostgreSQL)
-- Endereço completo de entrega no pedido da loja — hoje só existia
-- "região" solta (texto livre configurado no admin), sem CEP nem
-- endereço de verdade. Pedido explícito: exigir CEP + endereço
-- completo quando for entrega.
-- ============================================================================

alter table pedidos_loja add column if not exists cep_entrega text;
alter table pedidos_loja add column if not exists endereco_entrega text;
alter table pedidos_loja add column if not exists numero_entrega text;
alter table pedidos_loja add column if not exists complemento_entrega text;
alter table pedidos_loja add column if not exists bairro_entrega text;
alter table pedidos_loja add column if not exists cidade_entrega text;
alter table pedidos_loja add column if not exists estado_entrega text;

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 209
-- ============================================================================
