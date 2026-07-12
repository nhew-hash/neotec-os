# Changelog — Neotec OS

Todas as mudanças relevantes do projeto, por fase de desenvolvimento.

## [Fase 9] — Central de Comunicação e CRM configurável

### Adicionado
- Migração `fase9_central_comunicacao.sql`: tabelas `crm_etapas`,
  `crm_cards`, `crm_card_tags`, `crm_followups`, `crm_tags`,
  `whatsapp_conversas`, `whatsapp_mensagens`, `whatsapp_templates`,
  `whatsapp_logs` — todas com RLS multi-tenant (mesmo padrão da Fase 3).
  Seed das 13 etapas do funil pedido na missão (Lead → ... → Cliente VIP).
- `src/services/whatsapp/`: reestruturado na forma pedida —
  `whatsapp.api.ts` (cliente oficial da Meta Cloud API, envio desligado
  por padrão via `WHATSAPP_INTEGRACAO_ATIVA`), `whatsapp.templates.ts`
  (CRUD de templates, com `status_aprovacao` espelhando o ciclo de vida
  de aprovação da Meta), `whatsapp.logs.ts` (auditoria de toda chamada de
  API e todo webhook recebido), `whatsapp.automacao.ts` (nova mensagem →
  lead → cliente → follow-up → CRM, determinístico, sem IA).
- `src/app/api/whatsapp/webhook/route.ts`: Route Handler oficial —
  `GET` faz o handshake de verificação da Meta, `POST` recebe mensagens e
  status de entrega, valida a assinatura `X-Hub-Signature-256` quando
  `WHATSAPP_APP_SECRET` está configurado.
- `services/crm-pipeline/`: etapas, cards, tags e follow-ups do funil
  configurável — pasta nova, separada de `services/crm` (que continua
  servindo o `/crm` antigo) para não misturar os dois modelos.
- `/comunicacao`: interface inspirada no WhatsApp Web (lista à esquerda,
  chat à direita), mobile-first de verdade — em celular mostra lista OU
  chat, nunca os dois espremidos.
- `/comunicacao/pipeline`: Kanban do funil configurável, com follow-ups
  pendentes e criação rápida de oportunidade.
- Dashboard: nova seção Comunicação (mensagens hoje, conversas abertas,
  sem resposta, novos leads, retornos, tempo médio de resposta).
- Menu: item Comunicação adicionado — CRM (antigo) mantido.

### Decisão arquitetural — por que `conversas`/`mensagens`/`retornos` não foram tocadas
Esta fase poderia ter renomeado ou migrado essas tabelas da Fase 1 para o
novo modelo. Optei por não fazer isso: a missão explicitamente pede para
nunca renomear tabela sem motivo técnico real e para preservar
compatibilidade. `/crm` continua funcionando exatamente como estava. As
tabelas novas (`whatsapp_*`, `crm_*`) são uma segunda geração que
convive com a primeira — consolidar as duas é decisão de produto (qual
funil a equipe vai efetivamente usar), não uma decisão técnica para tomar
sem validar com quem vende no dia a dia.

---

## [Fase G] — Analytics
### Adicionado
- `services/analytics/analytics.service.ts`: faturamento por dia, lucro,
  desempenho por vendedor e por técnico (últimos 30 dias).
- `/analytics`: página restrita a admin/gerente (mesma regra de quem vê
  lucro) — gráfico de faturamento (recharts) + rankings.
- Dependência nova: `recharts`.

### Notas
- WhatsApp (camada de eventos) e Loja Virtual (placeholder) — que também
  fazem parte do escopo da Fase G da missão — já haviam sido entregues
  nas Fases C e F respectivamente, porque a OS e o hub de login
  dependiam delas para funcionar de ponta a ponta. Registrado aqui só
  para não parecer que ficaram de fora.

## [Fase F] — Portal do Cliente, Consulta Pública de OS, Login redesenhado
### Adicionado
- Migração `fase8_portal_cliente_consulta_publica.sql`: `clientes.portal_user_id`
  + `senha_provisoria`, policies de RLS somente-leitura escopadas por
  `current_portal_cliente_id()`, função pública `consultar_os_publico`
  (grant para `anon` — única função do sistema chamável sem sessão).
- `lib/supabase/admin.ts`: cliente com Service Role Key, uso restrito a
  Server Actions administrativas (criação de usuário do portal).
- `services/portal`: criação de acesso (gera senha provisória, mostrada
  uma única vez para a equipe) e troca de senha obrigatória no 1º acesso.
- Grupo de rotas `(portal)`: login próprio, dashboard, ordens, compras,
  cashback, garantias, histórico, notificações, perfil — shell mobile
  com navegação inferior própria, sem sidebar da equipe.
- `/consultar-os`: rota totalmente pública, sem sessão.
- `/loja`: placeholder da Loja Virtual.
- Hub de login (`/login`) com 4 entradas: Área da Equipe, Portal do
  Cliente, Consultar Ordem, Loja Virtual. Login da equipe movido para
  `/login/equipe`.

### Alterado
- `lib/supabase/middleware.ts`: rotas públicas (`/login`, `/portal`,
  `/consultar-os`, `/loja`) isentas da exigência de sessão de equipe —
  sem isso o Portal e a consulta pública ficariam inacessíveis.

### Decisão arquitetural
- **Login do Portal por e-mail, não por CPF.** CPF é opcional na base
  atual e é dado sensível (LGPD) — usá-lo como credencial pública
  contrariava os dois. Detalhes em `ARCHITECTURE.md`.

## [Fase E] — Investidores e Consignação
### Adicionado
- Migração `fase7_investidores_consignacao.sql`: tabelas `investidores`,
  `investidor_movimentos`, `consignacoes`; views `vw_investidor_resumo`
  e `vw_consignacao_resumo` (capital aplicado e lucro **calculados**,
  nunca armazenados soltos — mesmo princípio do cashback); liga os FKs
  de `aparelhos.investidor_id`/`consignacao_id` que ficaram pendentes
  da Fase 6.
- Módulos completos: `/investidores` (resumo, aportes/saques, aparelhos
  aplicados) e `/consignacao` (proprietário, valor combinado, lucro da
  loja ao vender).

### Nota de modelagem
- Saque de investidor é bloqueado no service se exceder o capital livre
  calculado — validação de negócio que a constraint do banco (`valor > 0`)
  não cobre sozinha.

## [Fase D] — Estoque Comercial vs. Estoque de Aparelhos
### Adicionado
- Migração `fase6_estoque_origens.sql`: `origem_entrada` (fornecedor,
  cliente, troca, compra, consignação, investidor, marketplace, leilão),
  `fornecedor`, `preco_minimo`, `preco_sugerido` em `aparelhos`; view
  `vw_aparelhos_seguro` recriada para mascarar também `preco_minimo`.

### Alterado
- Abas do Estoque renomeadas para a terminologia da missão: "Estoque de
  Aparelhos" / "Estoque Comercial" (o conceito de dois estoques já
  existia desde a Fase 1 como `aparelhos` vs. `produtos` — só faltava o
  nome na interface).

## [Fase C] — Ordem de Serviço completa
### Adicionado
- Migração `fase5_os_completa.sql`: numeração automática `OS000001`
  (sequence + trigger), `prazo`/`urgente`, tabela `checklist_os`
  (recebimento/entrega, itens: liga, molhado, arranhado, tela, Face ID,
  Touch, botões, câmeras, biometria, senha), fila de notificações
  WhatsApp (`fila_notificacoes` + `registrar_evento_whatsapp`).
- `services/whatsapp`: camada de eventos preparada (não envia de
  verdade — grava na fila com status `desativado`). Chamada por Vendas,
  Assistência e Cashback nos pontos certos do fluxo.
- Kanban de OS: número, modelo do aparelho, foto, valor, prazo, badge de
  urgência e de atraso.
- Impressão A4 e cupom térmico (`/impressao/os/[id]`), rota sem
  sidebar/topbar mas ainda autenticada.

## [Fase B] — Cliente 360° e Dashboard orientado a ação
### Adicionado
- Migração `fase4_cliente360.sql`: Apple ID, cidade/UF, aceita
  marketing, índice de aniversário.
- Perfil do cliente com 8 abas: Timeline, Ordens, Compras, Orçamentos,
  Garantias, Cashback, Conversas, Fotos.
- Dashboard reconstruído em torno de ação, não de módulo: 6 botões
  grandes (Nova OS, Nova Venda, Entrada de Aparelho, Novo Cliente,
  Buscar Cliente, Agenda de Retornos) + indicadores (OS em atraso,
  entregas do dia, estoque baixo, pendências, financeiro do dia,
  próximos aniversários).
- `components/layout/bottom-nav.tsx`: navegação inferior fixa,
  visível só em telas pequenas — mobile first de verdade, não só
  responsivo.

### Corrigido
- `services/clientes/clientes.service.ts` e `types/database.ts` tinham
  dois bugs de sintaxe (funções com assinatura cortada, provavelmente de
  uma edição anterior) que impediriam o projeto de compilar. Corrigidos
  ao estender esses mesmos arquivos para o Cliente 360°.

---

## [Fase A] — Multi-tenant, cargos, timeline

### Adicionado
- Migração `fase3_multitenant_cargos_timeline.sql`:
  - Função `current_user_loja_id()` e escopo de `loja_id` em todas as
    policies de RLS existentes (isolamento real entre lojas).
  - Novos cargos `gerente` e `caixa` no enum `cargo_usuario`.
  - Tabela `timeline_eventos` + triggers automáticos em vendas, ordens de
    serviço, cashback, garantias e cadastro de cliente.
  - RLS de `financeiro` ajustada: admin/gerente têm acesso completo; caixa
    consulta e lança, sem editar/excluir.
- `utils/permissions.ts`: fonte única para regras de visibilidade por
  cargo (`podeVerCusto`, `podeVerFinanceiro`, `podeVerCusto`, `CARGO_LABEL`).
- `services/timeline/timeline.service.ts`: leitura da timeline do cliente
  (escrita é feita só por trigger, nunca pela aplicação).
- `ARCHITECTURE.md`: registro vivo de decisões arquiteturais.

### Alterado
- `types/database.ts`: `CargoUsuario` agora inclui `gerente` e `caixa`.
- `components/estoque/produtos-table.tsx`, `aparelhos-table.tsx`,
  `components/vendas/vendas-table.tsx`, `components/layout/user-menu.tsx`,
  `app/(sistema)/clientes/[id]/page.tsx`: checagens de cargo duplicadas
  substituídas pelos helpers de `utils/permissions.ts`.

### Notas de migração
- A migração Fase 3 precisa rodar em **duas execuções** no SQL Editor do
  Supabase (o Postgres não permite usar um valor de enum recém-criado na
  mesma transação em que foi adicionado). Instruções no topo do arquivo SQL.

---

## [Fase 2] — Assistência, Financeiro, Cashback, Garantias
- Tabelas `ordens_servico`, `pecas_os`, `financeiro`, `cashback`, `garantias`.
- Funções `SECURITY DEFINER`: `obter_custo_produto`, `atualizar_checklist_venda`,
  `registrar_lancamento_financeiro`.
- Módulos completos: CRM (funil + retornos), Estoque (produtos + aparelhos
  + checklist de qualidade), Vendas (orçamento → venda automática +
  checklist de entrega), Assistência (Kanban de OS + peças), Financeiro.

## [Fase 1 / Sprint 0] — Fundação
- Next.js 15 + TypeScript + Tailwind + shadcn/ui + Supabase Auth.
- Login, layout protegido (sidebar/topbar), Dashboard inicial, CRUD de Clientes.
- Schema inicial: usuários, clientes, CRM, produtos, aparelhos, vendas,
  orçamentos — com RLS e views mascaradas de custo desde o início.
