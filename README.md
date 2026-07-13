# Neotec OS

Sistema de gestão da Neotec Araguari.

## Stack

- Next.js 15 (App Router) + TypeScript (sem `any` em nenhum arquivo)
- Tailwind CSS + shadcn/ui
- Supabase (Auth + Database + RLS)
- React Hook Form + Zod
- TanStack Query
- Lucide React

## Como rodar

```bash
npm install
cp .env.local.example .env.local   # preencha com as chaves do seu projeto Supabase
npm run dev
```

## Banco de dados — ordem de execução obrigatória

1. `neotec_os_schema_fase1.sql` — Clientes, CRM, Vendas, Estoque.
2. `supabase/migrations/fase2_assistencia_financeiro_cashback_garantias.sql` — Assistência, Financeiro, Cashback, Garantias.
3. `supabase/migrations/fase3_multitenant_cargos_timeline.sql` — **rodar em duas execuções** (instruções no topo do arquivo): multi-tenant por loja, cargos Gerente/Caixa, timeline automática do cliente.
4. `supabase/migrations/fase4_cliente360.sql` — campos do Cliente 360° (Apple ID, cidade/UF, aceita marketing, índice de aniversário).
5. `supabase/migrations/fase5_os_completa.sql` — numeração automática de OS (`OS000001`), prazo/urgência, checklist de recebimento/entrega, fila de notificações WhatsApp (camada preparada, não envia de verdade).
6. `supabase/migrations/fase6_estoque_origens.sql` — origem de entrada do aparelho, fornecedor, preço mínimo/sugerido, colunas de vínculo com investidor/consignação (sem FK ainda).
7. `supabase/migrations/fase7_investidores_consignacao.sql` — módulos de Investidores e Consignação, e liga os FKs pendentes da Fase 6.
8. `supabase/migrations/fase8_portal_cliente_consulta_publica.sql` — acesso do Portal do Cliente e consulta pública de OS.
9. `supabase/migrations/fase9_central_comunicacao.sql` — CRM configurável (etapas/cards/tags/follow-ups) e Central de Comunicação (conversas/mensagens/templates/logs do WhatsApp).
10. `supabase/migrations/fase10_remover_funil_antigo.sql` — remove `conversas.etapa_funil` e o funil antigo por completo. **A partir daqui, `/crm` é o Pipeline configurável** (não convive mais com o funil de 8 etapas da Fase 1).
11. `supabase/migrations/fase11_senha_aparelho_os.sql` — campo real de senha/PIN do aparelho no checklist da OS.
12. `supabase/migrations/fase12_os_aparelho_descricao.sql` — descrição livre do aparelho na OS (não depende de estoque cadastrado).
13. `supabase/migrations/fase13_tipo_senha_aparelho.sql` — distingue senha numérica de padrão de desenho.
14. `supabase/migrations/fase14_venda_sem_cliente.sql` — venda de balcão sem cliente vinculado (PDV).

Todas aditivas — nenhuma reescreve ou apaga dado das fases anteriores.

## Testes

```bash
npm run test
```

Cobertura atual: funções puras (`utils/format.ts`, `utils/permissions.ts`).
Testes de RLS e de fluxo completo (Server Actions contra um Supabase real)
ainda não existem — dependem de um projeto Supabase de teste dedicado, que
é decisão de infraestrutura a ser tomada pela equipe, não algo que se
simula localmente. Ver `ARCHITECTURE.md` para o racional.

## Documentação

- `ARCHITECTURE.md` — decisões arquiteturais e o porquê de cada uma
- `CHANGELOG.md` — histórico por fase de desenvolvimento

## Funções `SECURITY DEFINER` — por que existem

O vendedor não pode ver custo/lucro (regra de negócio), então ele não tem
`SELECT` na tabela base `produtos`/`aparelhos` — só na view mascarada. Mas
o servidor precisa do custo real para calcular lucro ao registrar uma venda,
e o financeiro é admin-only mesmo quando quem aciona a ação (aprovar venda,
entregar OS) é vendedor ou técnico. Estas funções resolvem isso com
privilégio elevado, chamadas só no servidor, nunca expondo o resultado
bruto ao navegador de quem não deveria ver:

- `obter_custo_produto` — calcula lucro de uma venda
- `atualizar_checklist_venda` — vendedor marca a entrega sem `UPDATE` geral em `vendas`
- `registrar_lancamento_financeiro` — grava o lançamento automático de venda/OS
- `registrar_evento_timeline` — grava evento da timeline (só via trigger, nunca direto do app)
- `registrar_evento_whatsapp` — grava evento na fila de notificações (camada preparada)
- `consultar_os_publico` — consulta pública de OS, sem sessão, expõe só campos seguros
- `current_user_loja_id` / `current_portal_cliente_id` — escopo de RLS multi-tenant e do Portal

## Variáveis de ambiente

Além de `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`, a
partir da Fase F o projeto precisa de `SUPABASE_SERVICE_ROLE_KEY` (Project
Settings → API → `service_role`) — usada **apenas** em
`lib/supabase/admin.ts`, para criar o acesso do cliente ao Portal via API
administrativa do Supabase Auth. Nunca prefixar essa chave com
`NEXT_PUBLIC_` — ela dá acesso total ao banco, ignorando todo RLS.

## Estrutura

- **`app/(auth)`** — login (rota pública)
- **`app/(sistema)`** — dashboard, CRM, clientes, estoque, assistência, vendas, financeiro, configurações (protegidas)
- **`components/ui`** — primitivos shadcn/ui
- **`components/<módulo>`** — interface específica de cada domínio
- **`services/<módulo>`** — todo acesso ao Supabase (Server Components/Actions nunca fazem query direta)
- **`hooks`** — hooks client-side (TanStack Query)
- **`types`** — tipos compartilhados, espelhando o schema do banco

## Cargos

`admin`, `gerente`, `vendedor`, `tecnico`, `caixa` — regras de visibilidade
centralizadas em `utils/permissions.ts`.

## Multi-tenant

Desde a Fase 3, todas as tabelas com dado de negócio são isoladas por
`loja_id` via RLS (`current_user_loja_id()`). Um painel cross-loja para um
eventual super-admin de SaaS ainda não existe — fora de escopo até haver
mais de uma loja real usando o sistema.

## O que ficou de fora deliberadamente

- Envio real de mensagem pelo WhatsApp — a camada de eventos está pronta
  (`services/whatsapp`, tabela `fila_notificacoes`) e todos os pontos do
  sistema já chamam `dispararEventoWhatsapp`, mas nada é enviado de
  verdade ainda (status fixo `desativado`). Ligar a API oficial da Meta é
  uma troca isolada nesse service, sem tocar em Vendas/OS/Cashback.
- Upload de foto real (campo é só URL por enquanto — Storage é decisão à parte)
- Comissão de vendedor (fórmula não definida)
- Regras de campanha/expiração de cashback (não definidas)
- Tela de configuração de permissões (RBAC já existe no banco desde a Fase 1, falta só a UI)
- Painel super-admin cross-loja (aguardando existir mais de uma loja real)
- Loja Virtual (placeholder de navegação apenas — catálogo/checkout/pagamento são decisão de negócio futura)
- Envio da senha provisória do Portal por WhatsApp/e-mail automaticamente — hoje a equipe repassa manualmente (mostrada uma única vez na tela)

## Central de Comunicação (Fase 9)

O webhook (`/api/whatsapp/webhook`) já recebe e grava mensagens reais assim
que configurado no Business Manager da Meta — isso não depende de flag
nenhuma. O que fica desligado por padrão é só o **envio**:
`services/whatsapp/whatsapp.api.ts` só chama a API de verdade se
`WHATSAPP_INTEGRACAO_ATIVA=true` **e** as credenciais estiverem
configuradas. Até lá, toda mensagem "enviada" pela tela de Comunicação
fica registrada no histórico com `status_entrega: erro` e o motivo — não
quebra a experiência, só não sai de verdade.

Passo a passo para ligar de verdade, quando for a hora:
1. Criar o app e o número de teste/produção no Meta for Developers.
2. Configurar o webhook apontando para `https://SEU-DOMINIO/api/whatsapp/webhook`, com o mesmo valor de `WHATSAPP_VERIFY_TOKEN` no handshake.
3. Preencher `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`.
4. Mudar `WHATSAPP_INTEGRACAO_ATIVA` para `true`.

Nenhum código muda — só variáveis de ambiente.

### CRM = Pipeline (consolidado na Fase 10)

`/crm` é o Pipeline configurável: 13 etapas pré-cadastradas
(Lead → ... → Cliente VIP), totalmente editáveis (`crm_etapas`). O funil
fixo de 8 etapas da Fase 1 foi removido — os dois conviveram por uma
fase inteira de propósito, pra validar qual a equipe usaria de verdade;
a resposta veio rápido (o funil antigo ficou órfão assim que a automação
de mensagens passou a alimentar só o novo) e foi decisão consciente
apagar, não só aposentar. Ver `ARCHITECTURE.md`.

`/comunicacao` ficou só com as conversas (lista + chat). Um card do CRM
pode estar vinculado a uma conversa (`whatsapp_conversas.card_id`), mas
o card é a entidade principal — a conversa é histórico dentro dele.

### Sidebar por cargo

O menu lateral é agrupado (Relacionamento / Operação / Gestão / Sistema)
e cada item só aparece pros cargos que conseguem de fato usá-lo — reflete
o que o RLS já bloqueava no dado, só que agora também no menu.

### Automação (sem IA, como pedido)

Toda mensagem recebida passa por `services/whatsapp/whatsapp.automacao.ts`:
relaciona/cria o cliente pelo telefone, cria um card no CRM na etapa
"Lead" se não houver um em aberto, e agenda um follow-up padrão de 24h.
É lógica determinística (`if`/`else`), não um modelo de IA — a missão
pediu explicitamente para preparar isso sem IA ainda.
