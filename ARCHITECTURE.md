# Arquitetura — Neotec OS

Este documento registra decisões arquiteturais e o porquê de cada uma, para
que ninguém precise adivinhar a intenção por trás do código depois. Atualizado
a cada fase do plano A→G.

---

## Fase A — Multi-tenant, cargos, timeline

### Por que RLS por `loja_id` e não um schema por loja
Um schema Postgres por loja escalaria mal além de algumas dezenas de lojas
(migrations precisam rodar N vezes, conexões de pool multiplicam). RLS com
uma função `current_user_loja_id()` central escala para centenas de lojas
sem multiplicar infraestrutura, ao custo de toda query precisar filtrar por
loja — o que o Postgres já faz automaticamente via policy.

### Por que `loja_id` não foi duplicado em toda tabela filha
Tabelas como `venda_itens`, `pecas_os`, `cashback`, `garantias`, `retornos`,
`mensagens`, `orcamento_itens` não guardam `loja_id` próprio. Ele é
verificado via `EXISTS` contra a tabela pai (`vendas`, `ordens_servico`,
`clientes`, etc.). Isso evita duas fontes de verdade para a mesma
informação (o mesmo motivo pelo qual `cashback_saldo` nunca virou campo
solto em `clientes` — decisão da fase de banco original). O custo é uma
subquery a mais por policy; irrelevante no volume de uma loja, e ainda
assim mais barato que reconciliar `loja_id` duplicado divergindo.

### Por que Timeline é gerada só por trigger, nunca pela aplicação
Se a escrita da timeline dependesse de cada Server Action lembrar de
chamar `registrarEvento()`, um dia alguém esquece um caminho de código
(ex: uma venda criada por um script de importação) e a timeline fica
incompleta silenciosamente. Trigger de banco garante que **todo** INSERT
relevante gera evento, independente de qual código o disparou.

### Por que `gerente` e `caixa` entraram como valores de enum, não como
tabela de papéis configurável
O RBAC granular (`modulos`/`permissoes`) já existe desde a Fase 1 para
controlar *o que cada papel vê na UI*. O enum `cargo_usuario` continua
sendo a fonte de verdade para *policies de RLS*, porque políticas de RLS
precisam de um valor comparável em SQL — uma tabela de papéis dinâmica
exigiria policies dinâmicas (via função), o que é possível mas
desnecessariamente complexo para 5 papéis conhecidos. Se o negócio pedir
papéis customizáveis por loja no futuro, essa decisão é revisitada.

### Por que `podeVerCusto`/`podeVerFinanceiro` viraram helpers centralizados
Antes desta fase, `cargo === "admin"` estava duplicado em 4 componentes
diferentes. Qualquer mudança de regra (ex: gerente também ver custo)
exigiria editar os 4 lugares — e é exatamente esse tipo de duplicação que
a missão pediu para eliminar. Agora há um único lugar (`utils/permissions.ts`)
que define a regra; os componentes só perguntam "posso?".

**Atenção:** esses helpers controlam apenas a **interface**. A garantia
real contra vazamento de dado sensível continua sendo o banco (RLS +
views mascaradas + funções `SECURITY DEFINER`), como decidido na fase de
banco de dados original. Um helper de UI nunca substitui isso.

---

## Decisões de fases anteriores (resumo, para contexto)

- Custo/lucro nunca trafega para quem não pode vê-lo — nem escondido na
  tela, mascarado a nível de banco via views + `SECURITY DEFINER`.
- Estoque de produtos simples (acessórios/peças): saldo sempre calculado
  via `movimentos_estoque`, nunca campo cacheado.
- WhatsApp: API oficial Meta é a direção assumida (não implementada ainda
  por decisão explícita — ver Fase G do plano).
- Login: Supabase Auth é a única fonte de autenticação; `usuarios` é
  tabela de perfil, nunca guarda senha.

---

## Decisões das Fases B–G

### Por que o login do Portal é por e-mail, e não por CPF (como pedido originalmente)
A missão original pedia CPF+senha. Duas razões pesaram contra: (1) `clientes.cpf`
é opcional na base desde a Fase 1 — tornar obrigatório agora exigiria migrar
dado retroativo ou aceitar que parte dos clientes nunca conseguiria acessar o
portal; (2) CPF é dado sensível (LGPD) e usá-lo como credencial pública de
login é uma prática desaconselhada — quem descobre um CPF (não é segredo,
circula em vários lugares) não deveria conseguir tentar login com ele. E-mail
resolve os dois problemas e é o padrão de qualquer portal de cliente do
mercado. CPF permanece campo cadastral, sem uso de autenticação.

### Por que "capital aplicado" e "lucro" do investidor são calculados, nunca armazenados
Mesmo princípio já usado para cashback e estoque desde a Fase 1: qualquer
saldo cacheado diverge do real mais cedo ou mais tarde (edição manual, bug,
falha de rede no meio de uma transação). `vw_investidor_resumo` deriva tudo
de `investidor_movimentos` (fonte de verdade dos aportes/saques) e de
`aparelhos`/`venda_itens` (fonte de verdade do que está em estoque vs.
vendido). Custa uma view com alguns joins; ganha-se nunca ter um número que
"não bate" e ninguém sabe por quê.

### Por que Investidor/Consignação não ganharam FK em `aparelhos` na mesma
### migração que criou as colunas (Fase 6)
`aparelhos.investidor_id` e `consignacao_id` foram criados na Fase 6 (Estoque)
como `uuid` solto, sem `references`, porque as tabelas `investidores` e
`consignacoes` só existem a partir da Fase 7. A Fase 7 liga o FK via
`ALTER TABLE ... ADD CONSTRAINT` assim que a tabela de destino existe. Isso
evita depender de uma ordem de criação diferente da ordem em que os módulos
foram efetivamente construídos, sem deixar as colunas permanentemente sem
integridade referencial.

### Por que a Service Role Key só aparece em `lib/supabase/admin.ts`
Criar o usuário de Auth do Portal (`supabase.auth.admin.createUser`) exige
a API administrativa do Supabase, que não funciona com a chave anônima. Esse
é o único ponto do sistema que precisa da Service Role Key — ela ignora TODO
o RLS. Isolá-la em um único arquivo, nunca importado por um Client Component,
é a proteção contra ela vazar por engano para o navegador.

### Por que a fila de WhatsApp nasce com status "desativado", não "pendente"
A missão pediu explicitamente para preparar a arquitetura sem ligar a
integração real. Um enum de status com o valor `desativado` como default
deixa isso auditável e explícito no schema — não é um "TODO" em comentário,
é um estado de dado que qualquer pessoa olhando a tabela entende. Ligar a
API da Meta no futuro é mudar esse default (e configurar credenciais), sem
tocar em nenhum service de domínio que já chama `dispararEventoWhatsapp`.

### Por que Analytics não é um módulo novo de RLS, e sim reaproveita a regra de lucro
`/analytics` não tem tabela própria — lê `vendas`/`ordens_servico` que já
têm RLS. A página apenas redireciona quem não pode ver lucro (`podeVerCusto`)
antes de renderizar. Criar uma policy nova só para "quem pode ver analytics"
seria duplicar uma regra que já existe e já é a correta.

---

## Decisões da Fase 9 (Central de Comunicação)

### Por que duas gerações de CRM convivem em vez de uma migração
`conversas`/`mensagens`/`retornos` (Fase 1) e `whatsapp_conversas`/
`whatsapp_mensagens`/`crm_cards`/`crm_etapas` (Fase 9) resolvem o mesmo
problema de domínio, com modelos diferentes — o novo é bem mais rico
(status de leitura, tempo de resposta, funil configurável, tags,
templates). Migrar o dado da primeira geração para a segunda numa mesma
entrega seria arriscado sem validar com a operação real: e se o funil de
8 etapas fixas for o que a equipe prefere no dia a dia por ser mais
simples? Manter as duas rodando, com o app apontando para a nova em
código novo, dá esse tempo de validação sem forçar a decisão agora.

### Por que o webhook usa a Service Role Key
A Meta chama o webhook servidor-a-servidor — não existe sessão de usuário
da equipe nesse contexto, então nenhuma policy de RLS baseada em
`current_user_cargo()` teria como autorizar a escrita. `whatsapp.service.ts`
usa `createAdminClient()` (mesmo cliente já usado para criar acesso do
Portal, Fase F) só nas funções acionadas pelo webhook
(`receberMensagemWebhook`, `processarAutomacaoNovaMensagem`) — todas as
outras funções do módulo (listar, enviar) continuam usando o cliente
normal, respeitando RLS.

### Por que a automação não usa trigger de banco, e sim service
A timeline (Fase A) e os lançamentos financeiros automáticos usam trigger
SQL porque são efeitos colaterais simples e sempre-verdadeiros de um
INSERT. A automação de "nova mensagem → lead → cliente → follow-up → CRM"
é mais parecida com um fluxo de negócio (várias decisões condicionais,
pode crescer bastante) — a missão pede explicitamente para não misturar
regra de negócio com camadas erradas, e trigger SQL é a camada errada
para lógica que vai evoluir. Fica em `whatsapp.automacao.ts`, chamado
pelo service depois de persistir a mensagem.

### Por que o envio tem uma flag (`WHATSAPP_INTEGRACAO_ATIVA`) mas o recebimento não
Enviar mensagem de verdade é uma ação com custo e risco (a Meta cobra por
conversa, e mensagem errada vai para o cliente de verdade) — faz sentido
manter atrás de uma flag explícita até a equipe decidir ligar. Receber é
diferente: o webhook só grava o que a Meta manda, é uma leitura passiva,
sem risco de causar um envio indevido. Por isso ele já funciona assim que
configurado no Business Manager, sem depender de flag nenhuma.
