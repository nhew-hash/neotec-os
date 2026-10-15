-- ============================================================================
-- Fase 269 — Integridade da Central de Comunicação (auditoria 360°)
--
-- 100% ADITIVA. Não apaga, não altera nem move nenhuma linha existente.
--
-- Problemas reproduzidos no código (ver docs/AUDITORIA_360.md):
--  1. O webhook da Meta reenvia o mesmo evento (retry). Sem unicidade em
--     whatsapp_mensagens.whatsapp_message_id, a mesma mensagem era gravada
--     duas vezes e a automação/IA rodava duas vezes.
--  2. Duas mensagens simultâneas de um número novo podiam criar duas
--     conversas "aberta" para o mesmo telefone. A partir daí o
--     `.maybeSingle()` do recebimento falhava (2 linhas) e CADA mensagem
--     nova criava mais uma conversa.
--  3. `nao_lidas` era lido e regravado pela aplicação (perdia contagem em
--     mensagens simultâneas).
--
-- Índices únicos só são criados se NÃO houver duplicatas antigas. Se houver,
-- a migration NÃO tenta "limpar" (isso misturaria históricos) — registra um
-- NOTICE com a contagem e cria um índice comum no lugar. A aplicação
-- continua deduplicando em código nos dois casos.
--
-- Reversão (segura, não toca em dado):
--   drop function if exists incrementar_nao_lidas_conversa(uuid);
--   drop index if exists uq_whatsapp_mensagens_message_id;
--   drop index if exists idx_whatsapp_mensagens_message_id;
--   drop index if exists uq_whatsapp_conversa_aberta_telefone;
-- ============================================================================

-- 1) Incremento atômico de não lidas -----------------------------------------
create or replace function incrementar_nao_lidas_conversa(p_conversa_id uuid)
returns integer
language sql
security invoker
set search_path = public
as $$
  update whatsapp_conversas
     set nao_lidas = coalesce(nao_lidas, 0) + 1,
         ultima_mensagem_em = now()
   where id = p_conversa_id
  returning nao_lidas;
$$;

-- Só o servidor (service role, usado pelo webhook) chama isto.
revoke all on function incrementar_nao_lidas_conversa(uuid) from public, anon, authenticated;
grant execute on function incrementar_nao_lidas_conversa(uuid) to service_role;

-- 2) Unicidade do id externo da mensagem -------------------------------------
do $$
declare
  v_duplicados integer;
begin
  select count(*) into v_duplicados
    from (
      select whatsapp_message_id
        from whatsapp_mensagens
       where whatsapp_message_id is not null
       group by whatsapp_message_id
      having count(*) > 1
    ) d;

  if v_duplicados = 0 then
    create unique index if not exists uq_whatsapp_mensagens_message_id
      on whatsapp_mensagens (whatsapp_message_id)
      where whatsapp_message_id is not null;
  else
    raise notice 'fase269: % whatsapp_message_id duplicado(s) já existentes — índice ÚNICO não criado; revisar manualmente (ver docs/AUDITORIA_360.md).', v_duplicados;
    create index if not exists idx_whatsapp_mensagens_message_id
      on whatsapp_mensagens (whatsapp_message_id)
      where whatsapp_message_id is not null;
  end if;
end $$;

-- 3) No máximo uma conversa ABERTA por telefone e loja -----------------------
do $$
declare
  v_duplicados integer;
begin
  select count(*) into v_duplicados
    from (
      select loja_id, telefone
        from whatsapp_conversas
       where status = 'aberta'
       group by loja_id, telefone
      having count(*) > 1
    ) d;

  if v_duplicados = 0 then
    create unique index if not exists uq_whatsapp_conversa_aberta_telefone
      on whatsapp_conversas (loja_id, telefone)
      where status = 'aberta';
  else
    raise notice 'fase269: % telefone(s) com mais de uma conversa aberta — índice ÚNICO não criado; consolidar manualmente antes (ver docs/AUDITORIA_360.md).', v_duplicados;
  end if;
end $$;
