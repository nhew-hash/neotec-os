# Neotec OS — Auditoria 360°, correções e redesign

Documento vivo da auditoria. Registra o estado encontrado, o que foi corrigido (com evidência), o que ficou pendente e as decisões que exigem aprovação. **Novas sessões continuam a partir daqui.**

- Branch de trabalho: `claude/compassionate-rubin-3ybesh` (sobre `main@3e41889`).
- Ambiente da auditoria: sem acesso ao Supabase de produção, à Vercel ou ao WhatsApp reais. Tudo marcado como **Reproduzido** foi verificado lendo o código e/ou rodando testes e telas locais. **Risco** = defeito evidente no código, sem reprodução contra dados reais. **Hipótese** = precisa de dado real para confirmar.
- Nenhuma migration foi aplicada em banco nenhum. Nenhuma mensagem foi enviada a ninguém.

---

## A. Diagnóstico geral

### Estado encontrado (Fase 1 — inventário)

| Item | Valor |
|---|---|
| Stack | Next.js 16 (App Router, Turbopack) + React 19 + TypeScript, Tailwind 3 + shadcn/ui, Supabase (Auth + Postgres + RLS + Realtime + Storage), TanStack Query, Zod, Vitest |
| Tamanho | ~76 mil linhas TS/TSX em 882 arquivos; 153 páginas (110 no sistema interno), 28 rotas de API, 44 domínios em `services/`, 144 migrations |
| Integrações | WhatsApp (Meta Cloud API + WhatsApp Web via Bridge no Railway), Mercado Pago, Meta Ads/CAPI e Google Ads (parcial), Claude/OpenAI/Gemini, QZ Tray (impressão), scraper Prostec |
| Testes | 48 arquivos, 537 testes (todos passando) — só funções puras; nenhum teste de RLS/fluxo contra banco |
| Build | Passa com Supabase acessível. Sem banco, falha nas páginas ISR do Achadinhos (consultam o Supabase no `next build`) — não é defeito em produção |
| Lint | `npm run lint` chama `next lint`, removido no Next 16; não há ESLint configurado |
| CI | Só o cron do Prostec; nenhum CI de testes/build |
| Schema base | O README manda rodar `neotec_os_schema_fase1.sql`, que **não está no repositório** (tabelas como `clientes`, `vendas`, `vw_vendas_seguro` não têm DDL versionado) |
| Documentação | `CHANGELOG.md` para na Fase 257; as fases 258–268 existem no código/migrations, mas não no changelog |

### Principais problemas

1. **Segurança**: webhook da Meta aceitava qualquer POST sem `WHATSAPP_APP_SECRET`; Next.js com falha crítica de bypass de middleware; prefixo de rota pública engolia `/loja-admin`; upload público sem validação.
2. **Integridade da Comunicação**: mensagens e conversas duplicadas por retry/corrida, erro de gravação ignorado, contador de não lidas com perda, status de entrega nunca atualizado.
3. **Envio "fingido"**: a tela dizia que enviou mesmo quando o provedor recusou; sugestão comercial ficava "enviada" sem a mensagem sair.
4. **Automação que fala com o cliente sem as travas**: toda mudança de etapa no CRM mandava WhatsApp ao cliente, inclusive para quem pediu "não contatar".
5. **Jobs do cron sem efeito**: vários rodam com o client de sessão, sem sessão; o RLS devolve zero linhas e nada acontece, sem erro.
6. **Números errados**: "hoje" no fuso do servidor (UTC), falha de consulta exibida como 0, faturamento com vendas canceladas, horários 3h adiantados em telas renderizadas no servidor.
7. **Fragmentação**: os três pilares não conversavam (perfil do cliente lia a tabela legada de conversas; rotina comercial não via os follow-ups do CRM; CRM baixava a base inteira de clientes para um `<Select>`).
8. **Navegação**: 39 itens no menu, 4 deles do NEO Performance; dois itens ativos ao mesmo tempo; itens de menu mortos.

### Módulos saudáveis × problemáticos

- **Saudáveis**: Central Comercial (Fase 268 — trata falha por fonte, não inventa número, nada é enviado sozinho; virou a referência de padrão), motor de importação de fornecedores (61 testes), busca de clientes da Central (`lib/telefone.ts`).
- **Problemáticos (corrigidos nesta rodada)**: Comunicação (recebimento/envio), CRM (Kanban e automação), Dashboard, middleware.
- **Problemáticos (pendentes, ver F)**: jobs de cron do Crediário/NeoLoc/Prostec, envios transacionais diretos ao provedor, NEO Performance (integração não real).

---

## Achados priorizados

Legenda de status: ✅ corrigido · ◐ parcial · ⏳ pendente · 🔒 exige aprovação.

| # | Pri. | Achado | Evidência | Status |
|---|---|---|---|---|
| S1 | **P0** | Webhook Meta (`/api/whatsapp/webhook`) aceitava qualquer corpo quando `WHATSAPP_APP_SECRET` não estava definido → injeção de mensagens, criação de clientes/cards e **resposta da IA via WhatsApp a números arbitrários** | Reproduzido (código: `assinaturaValida` retornava `true`) | ✅ fail-closed + testes |
| S2 | **P0** | `next@16.2.10` com falha **crítica** de bypass de middleware (App Router + Turbopack); o middleware é a 1ª barreira de login/cargo | `npm audit` | ✅ `next@16.4.1` |
| S3 | P1 | `startsWith("/loja")` tornava `/loja-admin` "público" no middleware → pulava o bloqueio de investidor/indicador/vendedor_prostec | Reproduzido (teste) | ✅ |
| S4 | P1 | `/api/loja/*` (busca, comparador, rastreamento) fora da lista pública → visitante anônimo recebia redirect para `/login`: **busca e comparador da loja só funcionavam para quem estava logado como equipe**; Analytics da Loja/atribuição perdiam todo visitante real | Reproduzido (código + teste) | ✅ |
| S5 | P2 | Upload do Catálogo de fotos (bucket **público**) aceitava qualquer arquivo e usava a extensão do navegador | Reproduzido (código) | ✅ |
| S6 | P2 | Busca de clientes interpolava o termo em `.or()` do PostgREST (vírgula/parêntese quebrava ou alterava o filtro) | Reproduzido (código) | ✅ |
| S7 | P3 | Segredo da Bridge comparado com `===` (não constante) | Código | ✅ (`bridge-auth` e rotas Prostec/Crediário) |
| S8 | P2 | `loja_sessoes`: INSERT anônimo `with check (true)` e SELECT para qualquer autenticado (inclusive Portal/investidor) | Migrations `fase183` | 🔒 proposta abaixo (G) |
| S9 | P2 | 10 alertas restantes do `npm audit` (cadeia de build do Tailwind 3; `uuid` dentro do SDK `mercadopago@2`, que só sai com major) | `npm audit` | ⏳ |
| C1 | P1 | Mensagem recebida gravada 2× em retry do webhook (sem unicidade em `whatsapp_message_id`) → automação e IA rodavam 2× | Risco (código + schema) | ✅ dedupe + índice único (fase269) |
| C2 | P1 | Com 2 conversas "aberta" para o mesmo telefone, `.maybeSingle()` falhava (erro ignorado) e **cada mensagem nova criava mais uma conversa** | Reproduzido (código) | ✅ |
| C3 | P1 | Erro ao gravar a mensagem recebida era ignorado (conversa "recebia" mensagem inexistente) | Código | ✅ |
| C4 | P2 | `nao_lidas` lido+regravado (perde contagem em simultâneo) | Código | ✅ RPC atômica (fase269) com fallback |
| C5 | P1 | Status de entrega da Meta (`statuses[]`) só ia para log; o chat nunca mostrava entregue/lido/falhou reais | Código | ✅ (só avança, testado) |
| C6 | P1 | `enviarMensagemAction` devolvia sucesso mesmo com o provedor recusando | Código | ✅ |
| C7 | P1 | Sugestão comercial marcada "enviada" sem a mensagem ter saído | Código | ✅ |
| C8 | P1 | Enter repetido enviava a mesma mensagem várias vezes (só o botão era desabilitado) | Código | ✅ |
| C9 | P2 | Webhook respondia 200 em erro → Meta não reenviava, mensagem perdida em falha transitória | Código | ✅ 500 (retry agora é seguro) |
| C10 | P2 | Busca de conversas por nome devolvia **todas** (`telefone.includes("")`) | Reproduzido (teste) | ✅ |
| C11 | P2 | Abrir uma conversa baixava a lista inteira 2× e o histórico completo | Código | ✅ conversa única + histórico paginado (200) |
| C12 | P3 | `console.log` com telefones nos logs | Código | ✅ removido |
| R1 | **P1** | Mudança de etapa no CRM mandava WhatsApp ao cliente **sempre**, direto no provedor: ignorava "não contatar" e horário, expunha nomes internos ("Lead", "Negociação"), não ficava no histórico | Reproduzido (código) | ✅ desligado por padrão; 🔒 religar |
| R2 | P1 | Automação criava 1 follow-up "Responder novo contato" **por mensagem** recebida | Código | ✅ 1 por card |
| R3 | P1 | Telefone da Meta sem o 9º dígito não casava com o cadastro → cliente duplicado | Risco (formato conhecido da Meta) | ✅ variantes testadas |
| R4 | P2 | Conversa nova de cliente com card perdido era vinculada ao card perdido (sumia do pipeline) | Código | ✅ |
| R5 | P1 | Cron `gerarFollowupsAutomaticos` com client de sessão → RLS devolvia zero; alerta de card parado **nunca rodou** pelo cron | Reproduzido (código + policy) | ✅ service role |
| R6 | P2 | Cron de retiradas agendadas da loja idem (produto agendado para sair nunca saía) | Código | ✅ (e saiu de arquivo `"use server"`) |
| R7 | **P1** | Cron da **régua de cobrança do Crediário**, do NeoLoc (bloqueios) e do Prostec com client de sessão → nunca executam | Reproduzido (policy `current_user_cargo()`) | 🔒 ligar começaria a **enviar cobranças e gerar bloqueios** que hoje não acontecem |
| R8 | P2 | Ações do Kanban (mover, perder, reabrir, excluir, "é assistência") ignoravam o resultado — erro silencioso; "OS criada" aparecia mesmo se falhasse | Código | ✅ |
| R9 | P2 | "Nova oportunidade": `<Select>` com todos os clientes; página do CRM baixava a base inteira | Código | ✅ busca no servidor |
| D1 | P2 | Dashboard: "hoje" no fuso do servidor (UTC) | Código | ✅ |
| D2 | P2 | Dashboard: falha de consulta virava `0` | Código | ✅ "—" + motivo |
| D3 | P2 | Faturamento somava vendas canceladas/estornadas; KPIs duplicados; "Retornos" contava todos os futuros; "Financeiro do dia" R$ 0 para quem não tem acesso | Código | ✅ |
| D4 | P2 | `formatDateTime`/`formatDate` sem fuso: horários **3h adiantados** em Server Components; data civil virava o dia anterior no navegador; erro de hidratação em Client Components | Reproduzido (testes) | ✅ |
| I1 | P1 | Perfil do cliente: aba "Conversas" lê a tabela legada (`conversas`, Fase 1); as conversas reais de WhatsApp não apareciam; nada de oportunidade/próxima ação | Código | ✅ card "Atendimento" (aba antiga mantida) |
| I2 | P2 | Minha rotina não via os follow-ups do CRM | Código | ✅ "Retornos do CRM" |
| I3 | P2 | Início e Minha rotina contavam "aguardando resposta" com regras diferentes | Código | ✅ mesma função |
| N1 | P3 | Dois itens de menu ativos ao mesmo tempo (startsWith por item) | Reproduzido (teste) | ✅ |
| N2 | P3 | "Meu perfil"/"Configurações" sempre desabilitados no menu do usuário | Código | ✅ |
| N3 | P3 | Sheets sem título (aviso de acessibilidade do Radix) | Código | ✅ `SheetTitle` |
| N4 | P3 | Canal realtime com nome fixo no contador de não lidas (duas instâncias disputavam) | Código | ✅ |
| N5 | P3 | Busca de clientes não voltava para a página 1; navegação a cada tecla; `/clientes` paginava em memória a base inteira | Código | ✅ |
| T1 | P2 | Envios transacionais (OS aberta, pagamento confirmado, aviso à equipe) chamam o provedor direto: não entram no histórico nem consultam "não contatar" | Código | ⏳ (fluxos legítimos e em uso; ver F) |
| T2 | P3 | Só 9 de 110 páginas do sistema têm `loading.tsx` | Contagem | ◐ Início com skeleton novo |
| T3 | P3 | `obterVendasPorPeriodo` (gráfico) ainda usa o dia do servidor | Código | ⏳ |

---

## B. Correções implementadas

Commits na branch, do mais antigo ao mais novo (ver `git log main..HEAD`).

| Achado | Causa | Arquivos | Solução | Validação |
|---|---|---|---|---|
| S1 | `assinaturaValida` fazia `return true` sem segredo | `services/whatsapp/webhook-assinatura.ts`, `app/api/whatsapp/webhook/route.ts` | Verificação pura fail-closed; opt-in só fora de produção (`WHATSAPP_WEBHOOK_ALLOW_UNSIGNED=true`) | 6 testes (`webhook-assinatura.test.ts`) |
| S2 | Versão vulnerável | `package-lock.json` | `npm audit fix` (sem `--force`), dentro do range `^16` | audit (crítica sumiu), tsc, 583 testes, build |
| S3/S4 | Prefixo solto e rota da vitrine ausente | `lib/rotas-publicas.ts`, `middleware.ts` | Regra exata-ou-subcaminho, extraída e testada; `/api/loja` público | 4 testes (`rotas-publicas.test.ts`) |
| S5 | MIME/extensão do cliente | `catalogo-fotos.actions.ts`, `whatsapp.actions.ts` | Lista branca JPG/PNG/WebP, 8 MB, extensão decidida no servidor; áudio `audio/*` ≤ 16 MB | tsc |
| S6/N5 | Interpolação no `.or()` / paginação em memória | `services/clientes/clientes.service.ts`, `clientes/page.tsx`, `clientes-search-bar.tsx` | Reaproveita `interpretarBuscaCliente`; telefone pelos 8 finais; `count` + `range` no banco; volta à página 1; debounce | tsc + telas |
| C1–C4, C9, C12 | Sem idempotência, `maybeSingle` com duplicata, erro ignorado, leitura+escrita | `whatsapp.service.ts`, `webhook/route.ts`, `supabase/migrations/fase269_comunicacao_integridade.sql` | Dedupe por id externo, conversa robusta (mais recente + recupera da corrida 23505), erro do insert lança, RPC atômica, webhook 500 em falha | tsc; migration com guarda de duplicatas |
| C5 | `statuses[]` só logado | `entrega-status.ts`, `whatsapp.service.ts` (`atualizarStatusEntrega`) | Mapeia sent/delivered/read/failed; nunca regride; `failed` é terminal | 4 testes |
| C6/C7 | Retorno não conferido | `whatsapp.service.ts` (`MensagemEnviada`, `exigirEnvioConfirmado`), `whatsapp.actions.ts`, `sugestoes-comerciais.service.ts`, `propostas.service.ts` | Envio devolve o motivo da falha; actions e sugestões só confirmam com o provedor confirmando | tsc |
| C8 | Enter sem checar `isPending` | `chat-panel.tsx` | Guarda + mantém o texto se falhar | revisão |
| R1 | Envio direto e incondicional | `crm-pipeline.actions.ts`, `crm-pipeline.service.ts` (`avisarClienteMudancaEtapa`) | Desligado por padrão; com `CRM_AVISO_ETAPA_WHATSAPP=true` passa por `avaliarEnvioAutomatico` e pelo envio registrado | tsc |
| R2–R4 | Inserção por mensagem / formato BR / filtro ausente | `whatsapp.automacao.ts`, `lib/telefone.ts` (`variantesTelefoneBR`) | 1 follow-up pendente por card, variantes com/sem 9º dígito, só card não perdido | 3 testes |
| R5/R6 | Client de sessão no cron | `crm-pipeline.service.ts`, `estoque/retiradas-agendadas.service.ts`, `api/cron/.../route.ts` | Service role (só lembretes internos / despublicar o que foi agendado), erros propagam | tsc |
| D1–D4 | Fuso do servidor, contagem `?? 0` | `services/dashboard/painel*.ts`, `utils/format.ts`, `utils/followups.ts` | Janela do dia de Brasília, `Indicador` ok/indisponível, só vendas concluídas, fuso fixo de exibição | 5 + 4 + 1 testes |
| I1–I3 | Telas isoladas | `atendimento-cliente-card.tsx`, `comunicacao-cliente-resumo.service.ts`, `central-comercial.service.ts` (`retornosDoDia`), `rotina.ts` | Entidades oficiais (whatsapp_conversas, crm_cards, crm_followups, orcamentos) — nenhuma cópia | 2 testes de rotina + telas |
| — | Sem CI | `.github/workflows/ci.yml`, `package.json` (`typecheck`) | typecheck + testes em todo push/PR; build com secrets de staging | YAML validado |

---

## C. Redesign

**Direção**: sóbrio, neutro, premium; um só azul de ação (#0071E3), Inter, raio médio, bordas finas, cor só com função. Escopo `.neotec-os` — **Loja, Portal e Login não mudaram**. Detalhes em `DESIGN_SYSTEM.md`.

- **Navegação**: pilares sempre no topo (Início, Comunicação, CRM, Central Comercial, Clientes); 6 grupos secundários recolhíveis que lembram o estado; item ativo único; sidebar recolhível (cookie, sem "pulo"); barra inferior por cargo com contador; título da seção no topo; **busca Ctrl+K** (módulos do cargo, clientes, conversas); "pular para o conteúdo".
- **Início**: "Precisa de você" (cada linha leva aos registros) + "Hoje" + gráficos só para gestão; aviso quando o WhatsApp está desconectado.
- **Comunicação**: tela cheia; filtros de atendimento (não lidas, minhas, sem responsável, aguardando humano, sem cadastro); horário relativo; cabeçalho com etapa do CRM, responsável (assumir/liberar), status do atendimento, IA e proposta; histórico paginado; falha de envio explícita na bolha ("o cliente não recebeu"); aviso de "não contatar"; painel do cliente com oportunidade, próxima ação, dias na etapa, retornos e propostas.
- **CRM**: filtros (busca, minhas, paradas, perdidas, origem, temperatura), contagem e soma por coluna, dias na etapa (âmbar quando passa do alerta), próxima ação e responsável visíveis, ações num menu com erro visível; Nova oportunidade com busca de cliente.
- **Central Comercial**: herda os tokens; "Retornos do CRM" na Minha rotina; a próxima ação considera retorno atrasado.
- **Clientes**: card "Atendimento" no perfil; atalhos Conversa/Proposta no cabeçalho; listagem paginada no banco.

Validação visual: screenshots desktop (1440×900) e celular (390×844) de Início, Comunicação (lista e conversa), CRM, Central Comercial, Clientes e Ctrl+K, nos cargos admin e técnico, contra um Supabase falso local (fixtures de demonstração; não versionado).

---

## D. Destino dos módulos secundários

Não houve acesso ao banco de produção: **uso não confirmado** em todos (não dá para contar registros/usuários). Decisões baseadas em dependências de código e no estado da integração. Nada foi apagado.

| Módulo | Dependências encontradas | Estado | Decisão |
|---|---|---|---|
| **NEO Performance** (`/neo-performance`, 7 páginas, ~2 mil linhas de service) | `attribution.service` é chamado no pagamento (`payment.controller.ts`) e lê `loja_sessoes`; 3 migrations (259–261) | Sync de Meta/Google Ads **não implementada** (doc do próprio módulo); painel zerado sem lançamento manual; automações travadas por padrão | **Retirado do destaque**: 1 entrada em "Outros módulos" (o hub linka Inteligência, Creative Factory, Automação, Oportunidades, System Health). Rotas intactas. Não descontinuar enquanto `attribution` estiver no fluxo de pagamento |
| **NEO — Inteligência** | Usa a camada de IA (`ia.service`) | Funcional sob demanda | **Integrar ao hub NEO** (saiu do menu; acessível pelo hub) |
| **NEO — Creative Factory** | IA de texto; geração de imagem (`GEMINI_IMAGE_API_KEY`) **não implementada** | Parcial | **Integrar ao hub NEO**; avaliar descontinuação mediante aprovação, se o uso não se confirmar |
| **Cotações** (`/cotacoes`, 4 páginas) | Alimenta a **busca de preço da IA de atendimento** (`ia-atendimento-busca.service.ts`) | Funcional | **Manter**, em "Vendas e operação" |
| **Catálogo de fotos** (`/catalogo-fotos`) | Usado pelo **envio de foto no chat** e pela IA de atendimento | Funcional; upload endurecido | **Manter**, em "Catálogo e cadastro", ao lado do Banco de imagens. Avaliar unificação com o Banco de imagens (sobreposição de função) mediante aprovação |

---

## E. Testes executados (resultados reais)

| Comando | Antes | Depois |
|---|---|---|
| `npx tsc --noEmit` | ✅ 0 erros | ✅ 0 erros |
| `npx vitest run` | ✅ 48 arquivos, 537 testes | ✅ 56 arquivos, **583 testes** (46 novos) |
| `next build` (Supabase falso local) | ✅ | ✅ (após upgrade do Next também) |
| `next build` (sem Supabase) | ❌ falha no prerender ISR do Achadinhos (rede) | ❌ igual — não é defeito de produção; CI só faz build com secrets de staging |
| `npm audit --omit=dev` | 16 (1 crítica, 9 altas) | 10 (0 crítica, 5 altas) |
| `npm run lint` | ❌ `next lint` não existe no Next 16 | ❌ igual (ver G); use `npm run typecheck` |
| QA visual (Playwright, 2 viewports, 2 cargos) | — | ✅ sem erros de página; único erro de console é o WebSocket do realtime (o stub não tem realtime) |

**Não executado** (dependem de infraestrutura que esta sessão não tem): testes de RLS contra Supabase real, fluxo de webhook real da Meta/Bridge, envio real de WhatsApp, cron real. "Build passou" ≠ "sistema funciona": os fluxos com banco real precisam do checklist da seção G.

---

## F. Pendências

**Corrigidos** — tudo marcado ✅ na tabela de achados.

**Parcialmente corrigidos**
- T2: `loading.tsx` em só 9 das 110 páginas do sistema.

**Não corrigidos**
- T1: envios transacionais diretos ao provedor (abertura de OS, pagamento confirmado, trade-in, aviso à equipe) — não entram no histórico nem checam "não contatar". Proposta: rotear pelo `whatsapp.service` com conversa criada sob demanda.
- T3: gráfico "Vendas por período" no dia do servidor.
- S9: alertas restantes do audit (Tailwind 3 → 4 e `mercadopago` 2 → 3 são majors).
- `CHANGELOG.md` sem as fases 258–268; schema base (`neotec_os_schema_fase1.sql`) fora do repositório.
- Telas não redesenhadas ainda: Estoque, Vendas/PDV, Assistência, Financeiro, Crediário, Loja admin, Prostec, NeoLoc, NEO — já herdam tokens, navegação e tipografia, mas não passaram por revisão de fluxo.

**Bloqueios externos**
- Push para `nhew-hash/neotec-os`: a sessão não recebeu permissão de escrita no repositório (ver relatório final).
- Sem Supabase de staging, Meta, Bridge ou Vercel acessíveis: impossível validar RLS, webhooks e cron de ponta a ponta.

**Riscos que exigem aprovação (🔒)**
1. **R7 — ligar os jobs do cron do Crediário/NeoLoc/Prostec** (trocar para service role). Passariam a enviar cobranças reais pelo WhatsApp e a gerar comandos de bloqueio que hoje não ocorrem. Decidir com o time de cobrança antes; ligar um por vez, com dry-run.
2. **R1 — religar o aviso de mudança de etapa** (`CRM_AVISO_ETAPA_WHATSAPP=true`). Recomendação: só para etapas de assistência, com textos próprios para o cliente.
3. **S8 — `loja_sessoes`**: restringir SELECT a staff da loja e remover INSERT anônimo (o rastreamento já usa service role). SQL proposto (não versionado como migration de propósito):
   ```sql
   drop policy if exists "loja_sessoes_insert_publico" on loja_sessoes;
   drop policy if exists "loja_sessoes_select_staff" on loja_sessoes;
   create policy "loja_sessoes_select_staff" on loja_sessoes for select to authenticated
     using (current_user_cargo() in ('admin','gerente'));
   ```
4. Unificar Catálogo de fotos com Banco de imagens; descontinuar Creative Factory se o uso não se confirmar.

---

## G. Deploy — checklist obrigatório

1. **`WHATSAPP_APP_SECRET` precisa estar configurado na Vercel** se a Meta Cloud API estiver em uso. O webhook agora é fail-closed: sem o segredo, **mensagens da Meta passam a ser recusadas (401)**. Se a loja usa só o WhatsApp Web via Bridge, nada muda (a Bridge tem autenticação própria).
2. Aplicar `supabase/migrations/fase269_comunicacao_integridade.sql` (aditiva; se houver duplicatas antigas ela **não** cria os índices únicos e avisa por NOTICE — consolidar antes, manualmente). Sem ela, o código funciona com fallback (dedupe em código, contador não atômico).
3. `npm ci` (lockfile atualizado: Next 16.4.1).
4. Conferir em produção: receber uma mensagem (aparece uma vez só), enviar uma (status muda para entregue/lido), forçar falha (bolha vermelha "não enviada"), buscar na loja deslogado, abrir `/loja-admin` como investidor (deve redirecionar).
5. Opcional: secrets `CI_SUPABASE_URL`/`CI_SUPABASE_ANON_KEY` (projeto de staging) para o CI fazer build.

## Próximos passos (maior impacto)

1. Decidir R7 (cobrança/NeoLoc no cron) — hoje a régua de cobrança simplesmente não roda.
2. Rotear os envios transacionais (T1) pelo serviço central, com histórico e "não contatar".
3. Criar projeto Supabase de staging e testes de RLS/fluxo (webhook → conversa → card → follow-up) no CI.
4. Levar o mesmo tratamento de fluxo para Vendas/PDV e Assistência (próximos módulos mais usados no balcão).
5. Versionar o schema base e atualizar o CHANGELOG (258–269).

---

## Rodada 2 (2026-10-15) — lista nova da Realeza (Mac/iPad/AirPods) e vitrine

O site ao vivo (neotecbrasil.com) **não pôde ser aberto** nesta sessão (rede bloqueada pela política do ambiente e extensão do Chrome não conectada). O que segue foi auditado e corrigido pelo código, com testes.

| # | Pri. | Achado | Status |
|---|---|---|---|
| L1 | **P1** | Lista da Realeza só com AirPods / iPad / Mac mini / iMac / Pencil caía em `tipo_desconhecido`: **nada era cadastrado** | ✅ tipo próprio `apple_mac_ipad_airpods` |
| L2 | **P1** | `tipo_desconhecido` era marcado como processado em silêncio (sem histórico, sem aviso) — a lista "sumia" | ✅ registrada em `import_execucoes` (tipo "desconhecido") + aviso ao dono |
| L3 | **P1** | Lista Apple sem iPhone (ex.: MacBook + AirPods) entrava no escopo `apple_lacrados`: a próxima lista de iPhones **tirava os Macs do site** e uma lista grande de Macs tiraria os iPhones | ✅ escopo separado |
| L4 | **P0** | Parser de Apple lacrados lia número do modelo como preço: "AirPods 4" a **R$ 4**, "iPad Air M3" a **R$ 3** | ✅ inteiro de 1–2 dígitos nunca é preço + descarte abaixo do mínimo da categoria |
| L5 | P1 | Mac mini, iMac, MacBook Air, AirPods Pro/Max e Pencil descartados como "comentário" | ✅ |
| L6 | P2 | Cor lixo ("Ipad Gb"); Mac "16/256" lido como 16 GB; "M4" × "M4 Pro" e "AirPods 4" × "AirPods 4 ANC" viravam o mesmo item | ✅ |
| L7 | P1 | AirPods e Apple Pencil **lacrados** não apareciam em nenhuma página da loja (só iPad/Mac/Watch tinham família) | ✅ Áudio / Acessórios |
| L8 | P1 | Lacrado sem regra de lucro na categoria entra com **preço do fornecedor (margem zero)**, em silêncio | ◐ aviso no resumo do WhatsApp; 🔒 a margem é decisão da loja |

**Para a lista nova ter "outra regra de preço"**: cadastre em Estoque → Importação automática → Regras de lucro as categorias `computadores_macbook`, `tablets_ipad` e `acessorios_apple` (condição Lacrado). Sem isso, esses itens sobem pelo preço da Realeza. A lista que já chegou e caiu como "desconhecida" precisa ser **reenviada** no grupo (ou encaminhada) para entrar.
