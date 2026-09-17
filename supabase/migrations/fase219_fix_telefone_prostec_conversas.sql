-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 219 (Supabase / PostgreSQL)
-- FIX: bot da Prostec "iniciava a conversa mas não continuava".
--
-- CAUSA RAIZ: prostec_conversas.telefone era gravado com o telefone BRUTO
-- vindo do Google Places (ex: "+55 34 99999-8888", com espaço/pontuação/
-- parênteses). Quando o lead respondia de verdade, o Bridge mandava o
-- telefone já em dígitos puros com "55" na frente (extraído do JID do
-- Baileys, ex: "5534999998888"). processarMensagemRecebidaIara() fazia um
-- `.eq("telefone", telefone)` exato — como os formatos quase nunca batiam
-- byte a byte, a conversa nunca era encontrada e a função retornava sem
-- fazer nada, silenciosamente. O código da aplicação já foi corrigido pra
-- normalizar os dois lados (mesmo padrão já usado no WhatsApp da loja —
-- ver src/utils/telefone.ts). Esta migração conserta as linhas que já
-- ficaram gravadas erradas, pra essas conversas voltarem a funcionar sem
-- precisar reenviar o primeiro contato.
-- ============================================================================

-- Normaliza pra dígitos puros com "55" na frente, igual paraFormatoInternacionalBR().
create or replace function _fase219_normalizar_telefone_br(bruto text)
returns text
language plpgsql
immutable
as $$
declare
  digitos text;
begin
  digitos := regexp_replace(coalesce(bruto, ''), '\D', '', 'g');
  if digitos = '' then
    return digitos;
  end if;
  if left(digitos, 2) = '55' and length(digitos) >= 12 then
    return digitos;
  end if;
  return '55' || digitos;
end;
$$;

-- prostec_conversas.telefone é UNIQUE — se, depois de normalizado, duas
-- linhas colidirem (mesmo número gravado duas vezes em formatos diferentes,
-- o que só aconteceria por bug anterior de duplicidade), mantém a conversa
-- mais recente e apaga a mais antiga em vez de deixar a migração falhar.
with normalizados as (
  select id, telefone, _fase219_normalizar_telefone_br(telefone) as telefone_normalizado,
         row_number() over (partition by _fase219_normalizar_telefone_br(telefone) order by ultima_mensagem_em desc nulls last, created_at desc) as rn
  from prostec_conversas
),
duplicadas as (
  select id from normalizados where rn > 1
)
delete from prostec_conversas where id in (select id from duplicadas);

update prostec_conversas
set telefone = _fase219_normalizar_telefone_br(telefone)
where telefone <> _fase219_normalizar_telefone_br(telefone);

update prostec_opt_out
set telefone = _fase219_normalizar_telefone_br(telefone)
where telefone <> _fase219_normalizar_telefone_br(telefone)
  and not exists (
    select 1 from prostec_opt_out o2
    where o2.telefone = _fase219_normalizar_telefone_br(prostec_opt_out.telefone)
      and o2.telefone <> prostec_opt_out.telefone
  );

drop function _fase219_normalizar_telefone_br(text);
