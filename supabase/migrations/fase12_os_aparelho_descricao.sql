-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 12 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: descrição livre do aparelho na OS.
--
-- ACHADO DE MODELAGEM: `ordens_servico.aparelho_id` aponta pra tabela
-- `aparelhos`, que é o ESTOQUE PRÓPRIO da loja (tem custo, preço de
-- venda, investidor...). Isso funciona quando a loja conserta um
-- aparelho do próprio estoque antes de revender, mas não faz sentido
-- pro caso mais comum de assistência técnica: o cliente traz o PRÓPRIO
-- aparelho pra consertar, que nunca foi e nunca vai ser item de estoque.
-- `aparelho_id` continua existindo (e continua opcional) pro primeiro
-- caso; `aparelho_descricao` cobre o segundo, sem exigir cadastro de
-- estoque pra abrir uma OS.
-- ============================================================================

alter table ordens_servico
  add column if not exists aparelho_descricao text;

comment on column ordens_servico.aparelho_descricao is
  'Descrição livre do aparelho do cliente (modelo, cor, etc.) quando ele não é um item do estoque próprio da loja.';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 12
-- ============================================================================
