-- T-05 — Custo/margem escondidos de vendedor NO BANCO (somente leitura).
-- Rodar SOMENTE em ambiente de teste, com um usuário de teste de cargo 'vendedor'.
-- Como usar: substitua <UUID_VENDEDOR_TESTE> e execute no SQL editor do ambiente de teste.
-- Cada bloco deve retornar 0 linhas "VAZOU". Qualquer linha = custo visível ao vendedor.
begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','<UUID_VENDEDOR_TESTE>','role','authenticated')::text, true);

-- 1) view segura de aparelhos: custo e preço mínimo devem vir nulos
select 'VAZOU vw_aparelhos_seguro' as problema, id from vw_aparelhos_seguro where custo is not null or preco_minimo is not null limit 5;

-- 2) tabela base de aparelhos: vendedor não deveria conseguir ler custo direto
select 'VAZOU aparelhos.custo' as problema, id from aparelhos where custo is not null limit 5;

-- 3) produtos.custo
select 'VAZOU produtos.custo' as problema, id from produtos where custo is not null and custo > 0 limit 5;

-- 4) itens de venda
select 'VAZOU venda_itens.custo' as problema, id from venda_itens where custo_unitario is not null and custo_unitario > 0 limit 5;

-- 5) lucro nas vendas
select 'VAZOU vendas.lucro' as problema, id from vendas where lucro is not null and lucro <> 0 limit 5;
select 'VAZOU vw_vendas_seguro.lucro' as problema, id from vw_vendas_seguro where lucro is not null and lucro <> 0 limit 5;

-- 6) trade-in e modelos de troca (margem/custo de revenda)
select 'VAZOU avaliacoes_trade_in' as problema, id from avaliacoes_trade_in where margem_revenda is not null limit 5;

rollback;
-- Se algum bloco falhar por coluna inexistente, ajuste ao schema real: o objetivo é provar
-- que o vendedor NÃO lê custo/margem. Erro de permissão ("permission denied") também é aprovado.
