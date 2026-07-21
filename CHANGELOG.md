# Changelog — Neotec OS

Todas as mudanças relevantes do projeto, por fase de desenvolvimento.

<<<<<<< HEAD
=======
## [Fase 36] — Redesign visual estrutural (aprovado após inventário + plano)

Diferente das rodadas anteriores (aditivas — mais card, mais gráfico, em
cima da mesma base visual), esta mexeu na BASE: tokens, tipografia,
componentes compartilhados. Isso propaga a mudança pras 51 páginas do
sistema de uma vez, sem precisar tocar cada tela individualmente.

### Camada 1 — Global (afeta o sistema inteiro)
- Sidebar aprofundada pra quase-preto (`#0B0D12`, era `#11131A`) —
  reforça o "chrome de controle" contra o conteúdo claro.
- Raio de canto reduzido: cards de 16px → 8px, controles de 10px → 6px.
  Sombra praticamente removida (`shadow-card` quase zero) — definição
  agora vem de borda de 1px, não de profundidade simulada.
- Fonte de display trocada: Sora → **Space Grotesk** (mais geométrica e
  angulosa — menos "app de consumo", mais "ferramenta técnica").
- Duas classes utilitárias novas, usadas em todo o sistema a partir de
  agora: `.neotec-dado` (números tabulares monoespaçados — todo valor
  grande de dashboard/score/dinheiro) e `.neotec-id-tag` (identificador
  estilo etiqueta — telefone, IMEI, número de OS).
- `PageHeader` (usado em quase toda tela): título maior, divisor sutil.
- Header mais compacto (16 → 14 de altura), alinhado com o bloco de logo
  da sidebar.

### Camada 2 — Dashboard
- `HeroStatCard` novo: linha de 6 cards grandes no topo (Faturamento,
  Vendas, Leads, Assistência, WhatsApp, IA) — tratamento visual
  deliberadamente diferente dos indicadores secundários (ícone como
  marca d'água, número em display, sem badge colorido ao redor).

### Camada 3 — CRM (Kanban)
- Avatar com iniciais no card (não existe upload de foto de cliente no
  sistema — iniciais é a alternativa honesta, não fingi ter uma foto).
- Telefone com `.neotec-id-tag`, score e valor com `.neotec-dado`.
- Produto desejado, temperatura, próxima ação, última interação já
  existiam (Fase 32) — só receberam o tratamento visual novo.

### Camada 4 — WhatsApp
- Telefone no cabeçalho do chat e na lista de conversas com
  `.neotec-id-tag`. Bolhas de mensagem herdam o raio menor
  automaticamente (via token compartilhado).

---

## [Fase 35] — Correção: eu tinha removido um campo real por engano na Fase 34

### Corrigido
- Na Fase 34, ao corrigir `clientes.temperatura` (que realmente não
  existia), removi por engano `temperatura` de `Conversa` também,
  presumindo (errado — pesquisa incompleta minha) que fosse tipo morto.
  `conversas` é uma tabela real, existe desde a Fase 1, usada na aba
  "Conversas" do Cliente 360° (`cliente-profile-tabs.tsx`) — e
  `temperatura` sempre foi uma coluna real dela, documentada
  explicitamente como "continua existindo" na própria Fase 10.
- **São três conceitos parecidos de nome, genuinamente diferentes**,
  cada um em sua tabela: `conversas.temperatura` (Fase 1, aba Conversas
  do Cliente 360°), `WhatsappConversa` (Fase 9, sistema de mensagens de
  verdade), `clientes.temperatura` (Fase 28, IA de Atendimento + Kanban).
  As três agora coexistem corretamente nos tipos.
- A migração da Fase 34 (criar `clientes.temperatura`) continua válida e
  necessária — o erro foi só na remoção indevida do campo de `Conversa`,
  não na adição em `Cliente`.

---

## [Fase 34] — Correção importante: clientes.temperatura nunca existiu no banco

### Corrigido
- Desde a Fase 28 (IA de Atendimento), várias partes do código
  referenciavam `clientes.temperatura` (o Kanban do CRM, o orquestrador
  da IA atualizando a temperatura do lead) — mas a coluna **nunca foi
  criada de verdade** no banco. O `temperatura: TemperaturaLead` que
  existia nos tipos pertencia a uma interface `Conversa` morta (nunca
  importada em lugar nenhum do projeto — sobra de um rascunho bem
  antigo), não ao `Cliente` real.
- Efeito prático até agora: a IA tentava gravar a temperatura do
  cliente a cada mensagem e isso falhava contra o banco real
  silenciosamente (sem travar o fluxo, mas sem gravar nada também); o
  Kanban não tinha como mostrar a cor de temperatura corretamente.
- Migração `fase34_temperatura_cliente.sql`: cria a coluna de verdade em
  `clientes` (`quente`/`morno`/`frio`, padrão `frio`). `Cliente` no
  TypeScript agora tem o campo certo; `Conversa` (tipo morto) perdeu o
  campo que nunca deveria ter tido.

---

## [Fase 33] — Correção: cron ajustado pro limite do plano Hobby da Vercel

### Corrigido
- `vercel.json` pedia execução de hora em hora (`0 * * * *`) — Vercel
  Hobby só permite 1x por dia. Ajustado pra `0 17 * * *` (14h Brasília).
  Efeito prático: o estágio D+0 ("algumas horas depois") deixa de ser
  preciso — dispara no mesmo dia se o cliente parou de responder de
  manhã, ou no dia seguinte se foi à tarde. D+1/D+3/D+5 não são afetados
  de forma relevante, já que são medidos em dias inteiros. Precisão de
  hora em hora exigiria o plano Pro da Vercel — registrado como
  limitação de infraestrutura, não de código.

---

>>>>>>> 5ec20fa (oo)
## [Fase 32] — CRM inteligente: lead score, follow-up de recuperação automático, relatórios

### Infraestrutura nova: Vercel Cron
A sequência de follow-up (D+0/D+1/D+3/D+5) precisa de checagem periódica
— "algumas horas depois do cliente parar de responder" não é algo que
dispara sozinho por evento, precisa de algo perguntando "já passou
tempo suficiente?" de tempos em tempos. Implementado como Vercel Cron
Job (`vercel.json`, roda de hora em hora) chamando
`/api/cron/follow-up-vendas`, autenticado por `CRON_SECRET` (não por
sessão de usuário — rota liberada no middleware, protegida por dentro).

**Atenção**: o plano Hobby da Vercel historicamente só permite cron 1x
por dia, não de hora em hora — pra granularidade fina como "algumas
horas depois" funcionar de verdade, pode ser necessário o plano Pro.
Confirme isso no painel da Vercel antes de contar com o D+0 funcionando
no mesmo dia.

### Adicionado
- Migração `fase32_crm_inteligente.sql`: `crm_cards` ganha `score`,
  `objecao`, `resumo_ia`, `proxima_acao`, `status_recuperacao`
  (ativo/sem_retorno/recuperado), `sequencia_followup`,
  `ultima_resposta_cliente_em`, `perdido`, `motivo_perda`.
  `crm_score_eventos` guarda cada motivo de pontuação (não só o total).
- **Lead score**: pesos fixos em código (perguntou preço +10,
  disponibilidade +20, condição de pagamento +30, compra hoje +25,
  reserva +30, comparou modelos +15) — a IA detecta QUAL sinal apareceu,
  o código soma os pontos. Mantém auditável, evita a IA "inventar" score
  diferente a cada chamada.
- **Temperatura refinada**: critérios específicos no prompt (quente =
  quer comprar/perguntou pagamento/pediu reserva/comparou modelos; morno
  = pesquisando; frio = só pediu informação).
- **Recuperação de objeção de preço**: "achei caro" não perde a venda —
  a IA pergunta o valor que o cliente tinha em mente e oferece verificar
  a melhor condição, em vez de desistir.
- **Follow-up de recuperação automático**: sequência D+0 (3h sem
  resposta) → D+1 → D+3 → D+5 (final, marca "sem retorno"). Mensagens
  baseadas nos templates definidos pelo dono do produto, com a IA
  personalizando pro contexto (nome, produto, resumo da conversa) — se a
  IA falhar, cai pro template puro (isso roda sem supervisão humana,
  precisa sempre mandar algo). Respeita IA pausada — humano assumiu a
  conversa, o follow-up automático não passa por cima.
- **Card do Kanban enriquecido**: badge de score, resumo da IA, badge de
  objeção, badge de "sem retorno"/"recuperado pela IA", próxima ação
  sugerida, botão "Marcar como perdido" (com motivo) / "Reabrir".
- **Relatórios do CRM** (`/crm/relatorios`): total de leads, taxa de
  conversão (cliente com pelo menos 1 venda concluída ÷ total de leads),
  tempo médio até fechar, vendas por vendedor (reaproveita
  `obterDesempenhoEquipe`, já existente), motivos de perda, contagem de
  recuperados pela IA e sem retorno.

### Ficou de fora, com honestidade
- **"Aprendizado da IA" (quais mensagens convertem mais, qual abordagem
  funciona melhor)**: não implementado como análise automática — exigiria
  volume de dados histórico + um pipeline de correlação mensagem→
  resultado que ainda não existe. O que ESTÁ pronto agora é a **captura**
  dos dados que essa análise precisaria (score events, motivo de perda,
  recuperação pela IA) — a base pra fazer isso depois, não a análise em
  si.
- Score e temperatura continuam sendo classificados pela IA a cada
  mensagem — não há ajuste automático de peso com base em resultado
  passado (isso seria a parte de "aprendizado" mencionada acima).

---

## [Fase 31] — Evolução da Central de Comunicação

Auditoria prévia confirmou que boa parte do pedido já existia (IA
ativa/pausada, status de entrega, tempo real, painel do cliente, RLS
multi-loja) — o esforço foi todo nos itens genuinamente novos.

### Adicionado
- **Chat**: auto-scroll pra mensagem mais recente (só quando o usuário já
  estava perto do fim — não interrompe quem está lendo mensagens
  antigas), botão "Ir para mensagem mais recente" quando necessário,
  separador de dia ("Hoje"/"Ontem"/data), animação sutil em mensagem
  nova, seletor de emoji (sem dependência nova — Popover não existia no
  projeto, implementado com estado local + clique-fora).
- **Lista de conversas**: busca por nome/telefone, filtros (Todos / Não
  lidas / IA ativa / Aguardando humano).
- **Badge de não lidas no menu lateral** ("Comunicação" com contador
  vermelho), em tempo real via Realtime — aparece na sidebar desktop e
  no menu mobile.
- **Notificações configuráveis** (`Configurações → Notificações`): som
  (beep sintetizado via Web Audio, sem arquivo externo), notificação
  desktop, auto-abrir conversa nova. Guardado em `localStorage` de
  propósito — é preferência do dispositivo/navegador, não da loja (única
  exceção válida à regra geral de não usar localStorage no projeto).
- **Ações rápidas no chat**: Criar OS e Criar Orçamento (levam pra tela
  certa com o cliente já pré-selecionado via `?clienteId=`), Adicionar
  observação (cria follow-up urgente no CRM na hora).
- **Painel do cliente enriquecido**: tags computadas (Novo cliente /
  Cliente antigo / Compra realizada / Em assistência / VIP) e etapa
  atual no funil do CRM, com a cor da etapa.

### Ficou de fora, com honestidade
- **Enviar catálogo / Enviar localização**: dependem de conteúdo real
  que ainda não existe configurado (PDF do catálogo, coordenadas da
  loja) — um botão sem o que enviar seria pior que não ter o botão.
- **Envio de imagem/documento/áudio/vídeo**: continua dependendo de
  Storage + endpoint de mídia (Cloud API/Bridge), decisão já registrada
  desde a Fase 9.
- **Preview da última mensagem na lista de conversas**: exigiria uma
  consulta adicional por conversa (subquery ou join complexo) — avaliado
  como não crítico frente ao resto do escopo desta rodada.
- **Paginação/carregamento incremental na lista de conversas**: não
  implementado — interage de forma não trivial com o Realtime (que
  insere no topo da lista); no volume de uma loja física isso não é
  gargalo real ainda. Fica documentado como próximo passo se o volume
  crescer muito.

---

## [Fase 30] — Redesign visual: dashboard com gráficos, CRM enriquecido, painel do cliente na conversa

Escopo revisado por auditoria antes de implementar — Design System (Dialog,
StatusBadge, PageHeader, skeletons) já existia da Fase 20, não foi refeito.

### Decisão de arquitetura de navegação
A reestruturação de sidebar em submenus aninhados (CRM > Clientes/
Conversas/Oportunidades, Vendas > Produtos/Estoque/Orçamentos...) foi
avaliada e **não implementada como pedido** — reorganizaria itens hoje
independentes em sub-itens de outro módulo, mudando a arquitetura de
navegação que a equipe já usa (decisão pensada na Fase 10), não só o
visual. Em vez disso, refinei o que já existe: transição mais suave no
hover/ativo, indicador de página atual com opacidade animada, ícone reage
ao estado ativo. Fica registrado como decisão pra revisitar se o dono do
produto confirmar que quer a reestruturação completa mesmo.

### Adicionado
- **Dashboard**: cards que faltavam (Vendas hoje, Faturamento hoje,
  Novos clientes hoje, OS em andamento, Follow-ups atrasados — esse
  último reaproveita `categorizarFollowups`, já existente, não duplica
  lógica). 4 gráficos novos (recharts, já era dependência): vendas por
  período, origem dos clientes, funil do CRM, desempenho da equipe.
- **CRM**: card do Kanban agora mostra telefone, origem, temperatura
  (com `StatusBadge` colorido e borda lateral por cor), última interação
  — além do que já existia (produto/título, valor, tags, indicador de
  conversa). Animação sutil de entrada quando o card muda de coluna
  (`animate-fade-in`, token já existente da Fase 20 — sem adicionar
  biblioteca de animação nova).
- **Comunicação**: painel lateral com informações do cliente na tela de
  conversa (compras, OS em aberto, garantias ativas, cashback) — visível
  em telas grandes, link direto pro perfil completo. Reaproveita
  `obterSaldoCashback` já existente.
- Paleta de cores conferida contra o pedido (azul tecnológico, verde,
  vermelho, âmbar) — já batia, nenhuma mudança necessária.

---

## [Fase 29] — Correção: erro de build no interpretador de cotações

### Corrigido
- `cotacoes-ia.service.ts` usava `.map().filter((item): item is Tipo => item !== null)`
  pra descartar itens sem preço válido — o TypeScript não conseguia
  provar a substituição de tipo de forma confiável nesse encadeamento
  específico, quebrando o build (`npm run build` falhava). Reescrito com
  um loop `for...of` simples, empurrando pro array só os itens válidos —
  mesmo resultado, sem a ambiguidade de tipo.

---

## [Fase 27-28] — Central de Cotações Inteligente + IA de Atendimento

### Central de Cotações Inteligente (Fase 27)
- Migração `fase27_central_cotacoes.sql`: `cotacoes`, `cotacao_itens`,
  `mapeamento_emoji_cor` (configurável, semente com os 7 emojis da
  missão original), `prioridade_busca_preco` (configurável — Estoque →
  Seminovos → Lacrados → Fornecedores por padrão). `categoria` e
  `fornecedor` são texto livre, não enum — permite qualquer categoria
  sem migração nova, como pedido.
- **Motor de interpretação por IA** (`cotacoes-ia.service.ts`): o prompt
  entende sequência de bateria como múltiplos aparelhos (ex:
  "90%⚫️90%🩶92%💛93%⚪️" → 4 itens separados), usa o mapa de emoji do
  banco (não hard-coded), nunca inventa preço — item sem preço claro é
  descartado, não estimado.
- **Nova Cotação**: colar texto → "Interpretar com IA" → prévia
  totalmente editável (cada campo, adicionar/remover linha) → só depois
  salva. IA nunca grava direto.
- Histórico nunca apaga — arquivar/reativar/duplicar. Comparação entre
  duas cotações (subiu/caiu/só numa das duas, com percentual). Dashboard
  com última importação, preço médio, quantidade por categoria, gráfico
  de evolução (recharts).
- Busca rápida **sem IA** — parser determinístico, cobre os exemplos da
  missão ("15 pro", "16 preto", "14 acima de 90%", "13 256"...). Decisão
  deliberada: latência de chamada de IA a cada busca seria ruim demais
  pra "pesquisa extremamente rápida".
- Configurações → Cotações: mapeamento de emoji (adicionar/remover) e
  reordenar prioridade de busca.

### IA de Atendimento (Fase 28)
- Migração `fase28_ia_atendimento.sql`: `configuracoes_ia.atendimento_automatico_ativo`
  (flag PRÓPRIA, separada de "IA ativa" — dá pra ligar IA só pra
  Cotações sem deixar ela falar com cliente ainda), `whatsapp_conversas.ia_pausada`,
  `whatsapp_mensagens.enviado_por_ia`.
- **4 regras de escalonamento pra humano**, definidas pelo dono do
  produto: cliente classificado como "quente" (reaproveita o campo
  `temperatura` que já existia em `clientes`, não é conceito novo),
  cliente pede atendimento humano explicitamente, IA sem confiança pra
  responder, e botão manual de pausa em toda conversa. Qualquer uma
  delas pausa a IA naquela conversa e cria um follow-up urgente (15 min)
  no CRM.
- **Nunca inventa preço**: busca primeiro (RAG simples — Estoque →
  Seminovos → Lacrados → Fornecedores, na ordem configurada em
  Configurações → Cotações), injeta o resultado real no prompt como
  fato. Sem resultado nenhum, a IA admite que não sabe e escala.
- Auto-pausa quando um humano manda mensagem manualmente na conversa —
  "assumir conversa" implícito, sem precisar de ação extra.
- Chat: selo "🤖 IA" nas mensagens que a IA mandou, botão "IA ativa /
  IA pausada" no cabeçalho de cada conversa.

### Confirmado por auditoria antes de implementar
Central de Cotações é domínio separado do estoque (`produtos`/`aparelhos`)
de propósito — cotação é oferta de fornecedor, nunca vira inventário da
Neotec automaticamente. IA de Atendimento só entra em produção depois
que Central de Cotações estiver validada em uso real, conforme decidido.

---

## [Fase 26] — Infraestrutura central de IA (multi-provedor)

Base pra Central de Cotações Inteligente (próxima fase) e qualquer
módulo futuro que precisar de IA — mesmo padrão de abstração já usado
pro WhatsApp (`WhatsappProvider`), aplicado aqui pra `AIProvider`.

### Adicionado
- Migração `fase26_infraestrutura_ia.sql`: `configuracoes_ia` (provedor
  ativo, modelo, temperatura, limite de tokens, prompt de sistema,
  ligado/desligado), `ia_logs` (toda chamada, sucesso ou erro, tokens,
  custo estimado, duração), `ia_cache` (preparado, opcional por chamada).
- **`AIProvider`**: interface única. Implementações reais: `OpenAIProvider`
  (padrão ativo) e `AnthropicProvider` (segunda implementação completa,
  não só um stub — confirma que a abstração funciona de verdade com mais
  de um provedor). `GeminiProvider` e `LocalProvider` são stubs
  explícitos, com erro claro se selecionados antes de serem
  implementados de verdade.
- **`executarPromptIA()`**: ponto único de entrada pra IA no sistema
  inteiro — retry (3 tentativas, backoff simples), timeout (30s por
  provider), log automático, cache opcional por `cacheKey`. Nenhum
  módulo deve chamar um provider diretamente.
- **Configurações → IA**: escolher provedor/modelo, ativar/desativar,
  temperatura, limite de tokens, prompt de sistema, botão "Testar
  conexão" (chama a IA de verdade com um prompt trivial), painel de
  consumo estimado (chamadas, tokens, custo aproximado, taxa de sucesso
  dos últimos 30 dias).

### Decisão de segurança
A API Key em si **nunca** fica no banco nem trafega pro navegador — vive
só em variável de ambiente (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`,
`GEMINI_API_KEY`). A tela de Configurações mostra se cada provedor tem
chave configurada (✓/✗), não edita o valor. Todo o resto (provedor
ativo, modelo, comportamento) fica no banco, trocável sem deploy.

### Confirmado por auditoria antes de implementar
Não existia nenhuma IA/atendente construído no Neotec OS até esta fase —
a única menção a "IA" no código era um comentário indicando ausência
dela. "IA do atendimento" continua fora do escopo desta entrega — é a
Central de Cotações (próxima fase) que vai consumir essa infraestrutura
primeiro.

---

## [Fase 25] — CRM em tempo real

### Adicionado
- Migração `fase25_realtime_crm.sql`: Realtime habilitado em `crm_cards`,
  `crm_followups` e `retornos`.
- `useCrmRealtime` / `CrmRealtimeListener`: diferente do chat (Fase 24),
  os cards do Pipeline dependem de dado combinado (cliente, tags,
  conversa vinculada) que o payload puro do Realtime não traz pronto —
  em vez de duplicar a lógica de junção no navegador, o hook só escuta
  mudança em `crm_cards`/`crm_followups` e pede pro Next.js buscar os
  dados de novo (`router.refresh()`, com debounce de 600ms pra não
  disparar várias vezes seguidas se chegar mensagem em rajada).
- Resultado prático: lead criado automaticamente por mensagem nova do
  WhatsApp aparece no Pipeline sozinho, sem precisar recarregar a tela.

---

## [Fase 24] — Central de Comunicação em tempo real + notificação do navegador

### Adicionado
- Migração `fase24_realtime_comunicacao.sql`: Realtime habilitado em
  `whatsapp_conversas` e `whatsapp_mensagens` (só `integracoes_whatsapp`
  tinha isso até agora).
- `ChatPanel`: mensagem nova (recebida ou enviada) aparece na conversa
  aberta sozinha, sem precisar recarregar a página. Atualização de
  status de entrega (enviado → entregue → lido) também chega em tempo
  real.
- `ConversasList`: lista de conversas atualiza sozinha — conversa nova
  aparece, contador de não lidas muda, ordenação por última mensagem se
  ajusta — tudo sem F5.
- **Notificação do navegador**: mensagem de entrada dispara notificação
  nativa quando a aba não está em foco (pede permissão uma vez,
  silenciosa se negada). Só notifica mensagem do CLIENTE — nunca a que a
  própria equipe manda.

---

## [Fase 26] — WhatsApp Web: suporte a contas migradas pra LID

### Contexto
O WhatsApp está migrando parte das contas pra um identificador interno
("LID"), diferente do número de telefone — pra algumas contas, o
telefone real simplesmente não fica disponível pro Bridge nenhuma hora.
Isso quebrava tanto o recebimento (telefone errado salvo) quanto a
resposta (resolução por telefone falhava).

### Adicionado
- Migração `fase23_jid_envio_whatsapp_web.sql`: coluna
  `whatsapp_conversas.jid_envio` — guarda o identificador exato de
  resposta que o WhatsApp deu na mensagem recebida (LID ou telefone),
  separado do `telefone` (que continua só pra exibição/achar-criar
  cliente).
- `WhatsappProvider.enviarTexto` ganhou um terceiro parâmetro opcional
  (`jidDireto`) — Meta Cloud API ignora, WhatsApp Web usa quando
  disponível, evitando depender de resolver telefone pra responder.
- Bridge: `/enviar` aceita `jid` direto agora; só tenta resolver por
  telefone (`onWhatsApp`) quando não tem o JID de uma conversa anterior.
- Logs de diagnóstico adicionados no Bridge (`messages.upsert` recebido,
  mensagem processada, confirmação do Neotec OS) — antes só logava erro,
  dificultando saber se o problema era "não chegou" ou "chegou e falhou
  em algum ponto depois".

---

## [Fase 25] — Correção: formato do telefone (causa raiz de envio falhar e leads duplicando)

### Corrigido
- **Telefone salvo no cadastro nunca tem "55"** (código do Brasil) — só
  DDD + número (`clientes.schema.ts` sempre validou assim). Mensagem
  recebida (Meta ou WhatsApp Web) chega com o número **completo**, com
  "55". Isso causava dois problemas reais, silenciosos até agora:
  1. **Envio falhava** — `to: telefone` ia sem "55" pra Meta, e a
     resolução de JID do WhatsApp Web (`onWhatsApp`) não achava o
     contato. Corrigido com `paraFormatoInternacionalBR()`, aplicado no
     único ponto de envio (`whatsapp.service.ts`) — vale pros dois
     provedores de uma vez.
  2. **Lead duplicava a cada mensagem, mesmo de cliente já cadastrado**
     — a automação comparava telefone com "55" contra cadastro sem "55",
     nunca casava. Corrigido com `paraFormatoLocalBR()` em
     `whatsapp.automacao.ts`, aplicado antes de buscar/criar cliente.
- Utilitários novos em `utils/telefone.ts` — um único lugar que sabe
  converter entre os dois formatos, ao invés de cada ponto do sistema
  reinventar isso.

### Pendência que fica pra você decidir (não mexi sozinho)
Clientes criados automaticamente **antes** desse fix podem ter ficado
com `whatsapp` salvo COM "55" (formato errado, diferente do resto do
cadastro) — e podem existir duplicados de um mesmo cliente por causa
disso. Não fiz limpeza de dado automática porque mesclar cadastro de
cliente é operação sensível (risco de perder histórico se feito errado).
Se quiser, rodo uma consulta pra você primeiro ver quantos casos existem
antes de decidirmos o que fazer.

---

## [Fase 24] — Correção: whatsapp_logs sem política de INSERT

### Corrigido
- `whatsapp_logs` só tinha RLS de SELECT (admin) desde que a tabela foi
  criada na Fase 9 — nunca teve política de INSERT pra ninguém. Isso
  fazia todo log de envio/recebimento falhar silenciosamente
  (`registrarLog` engole o erro de propósito, pra log não derrubar o
  envio de verdade) — mas também escondia o motivo real de falhas de
  entrega, dificultando diagnóstico.
- `registrarLog` agora usa a Service Role Key — é infraestrutura de
  auditoria, não dado de usuário, não deveria depender de RLS de sessão.

---

## [Fase 23] — Correção: erro ao salvar provedor de WhatsApp

### Corrigido
- `salvarProviderAtivo` usava `.neq("id", "")` tentando dizer "atualiza a
  única linha que existir" sem saber o id de antemão — mas `id` é `uuid`,
  e comparar com string vazia quebra (`invalid input syntax for type
  uuid: ""`). Corrigido: busca o id real da linha (RLS já garante que só
  existe uma por loja) antes de atualizar.

---

## [Fase 22] — Multi-provider WhatsApp: Meta Cloud API + WhatsApp Web (QR Code)

### Achado arquitetural crítico (documentado antes de implementar)
A Vercel roda em funções serverless — sem estado entre requisições, sem
processo em segundo plano. O Baileys (WhatsApp Web) precisa de uma
conexão WebSocket permanente, aberta 24h. Isso é incompatível com
serverless por natureza, não por configuração. Solução: o serviço que
roda o Baileys de verdade (`whatsapp-bridge/`, projeto **separado**, fora
deste repositório) precisa de hospedagem própria e sempre ligada
(recomendado: Railway). Ele conversa com o Neotec OS só por HTTP
autenticado — nunca acessa o banco diretamente.

### Adicionado
- Migração `fase22_integracoes_whatsapp_multiprovider.sql`: tabela
  `integracoes_whatsapp` (provider ativo, status, número, QR Code, contador
  de mensagens do dia), função `incrementar_mensagens_hoje_whatsapp_web()`,
  Realtime habilitado nesta tabela.
- **Camada de abstração `WhatsappProvider`** (`services/whatsapp/providers/`):
  interface única (`enviarTexto`, `enviarTemplate`, `obterStatus`).
  `MetaCloudProvider` encapsula a integração oficial já existente (nenhuma
  lógica de envio mudou, só passou a ficar atrás da interface).
  `WhatsAppWebProvider` é um cliente HTTP puro pro serviço Bridge — não
  roda Baileys dentro do Neotec OS. `provider-resolver.ts` é o único
  lugar que decide qual provider está ativo, lendo do banco.
- `whatsapp.service.ts` refatorado: `enviarMensagem`/`enviarMensagemTemplate`
  passam pelo provider ativo. Recebimento de mensagem normalizado
  (`receberMensagemNormalizada` — substitui `receberMensagemWebhook`):
  tanto o webhook da Meta quanto o endpoint que recebe evento do Bridge
  traduzem seu payload específico pro mesmo formato antes de chamar essa
  função — a lógica de "achar/criar cliente, abrir conversa, rodar
  automação" existe uma vez só, os dois provedores compartilham.
- 3 endpoints novos (`/api/integracoes/whatsapp-web/{status,qr,mensagem}`),
  autenticados por segredo compartilhado (`WHATSAPP_WEB_BRIDGE_SECRET`),
  chamados pelo Bridge — nunca por sessão de usuário.
- Tela **Configurações → Integrações → WhatsApp**: escolha do provider,
  card de status do WhatsApp Web com QR Code, atualização em tempo real
  via Supabase Realtime (sem precisar recarregar a página) — tema escuro,
  conforme pedido.
- Card de status do WhatsApp no Dashboard.
- **`whatsapp-bridge/`**: projeto Node.js separado, com Baileys, pronto
  pra deploy no Railway (README com passo a passo completo). Reconexão
  automática, logout de verdade (limpa sessão), geração de QR Code,
  encaminha mensagem recebida pro Neotec OS em formato já normalizado.

### Confirmado, não quebrado
- O funil do CRM (automação "nova mensagem → lead → cliente → follow-up →
  card") continua funcionando exatamente igual — só mudou o nome da
  função de entrada (`receberMensagemWebhook` → `receberMensagemNormalizada`),
  nenhuma lógica de automação foi alterada.
- Meta Cloud API continua sendo o provider padrão; nada muda pra quem não
  mexer na tela de Configurações.

### Risco documentado, não escondido
Baileys é biblioteca não-oficial (engenharia reversa do protocolo do
WhatsApp) — risco real de banimento do número em uso comercial intenso.
Decisão consciente do dono do produto, registrada aqui e no
`whatsapp-bridge/README.md`.

---

## [Fase 21] — Correção crítica: erro de servidor em /crm e /clientes

### Corrigido
- **Bug real, introduzido na Fase 20**: `paginar()` (dentro de
  `components/ui/pagination.tsx`) e `contarFollowupsUrgentes()` (dentro
  de `components/crm/pipeline-sidebar.tsx`) são funções utilitárias
  puras, mas estavam em arquivos com `"use client"` no topo. Server
  Components (`/clientes` e `/crm`, ambos `page.tsx` assíncronos) as
  importavam e chamavam diretamente — isso quebra em runtime, porque o
  bundler trata **todo** export de um arquivo `"use client"` como
  referência de cliente, mesmo que não seja um componente React.
- **Correção**: as duas funções foram extraídas pra arquivos utilitários
  puros, sem `"use client"` — `utils/paginar.ts` e `utils/followups.ts`
  (esse último também exporta `categorizarFollowups`, usada pelo
  componente visual `FollowupsPanel`, e o tipo `ItemFollowupUnificado`).
  Os componentes React (`Pagination`, `FollowupsPanel`,
  `NovaOportunidadeButton`) continuam nos arquivos `"use client"`
  originais — só a lógica pura saiu de lá.
- Rodada uma varredura no projeto inteiro atrás do mesmo padrão (função
  utilitária de nome minúsculo exportada de arquivo `"use client"`) —
  os únicos outros casos encontrados são hooks React (`useCurrentUser`,
  `useClientes`), que **corretamente** ficam em arquivos client (hook só
  pode ser chamado de dentro de Client Component). Nenhum outro caso do
  bug real.

### Nota técnica pra não repetir
Regra prática: um arquivo `"use client"` só deve exportar **componentes
React** e **hooks** — nunca uma função utilitária pura que algum Server
Component vá chamar diretamente. Se uma função não usa `useState`,
`useEffect` ou outro hook, e não retorna JSX, ela não pertence a um
arquivo `"use client"`.

---

## [Fase 20] — Reformulação visual: Design System

Etapa exclusivamente visual — nenhuma regra de negócio ou funcionalidade
nova, conforme pedido. Abordagem: melhorar os **componentes
compartilhados** (Card, Table, Button, Badge...) em vez de reescrever
cada uma das ~40 telas — como a maioria já é composta a partir desses
primitivos, a melhoria se propaga sozinha.

### Adicionado
- **`Dialog`** (`components/ui/dialog.tsx`) — modal de verdade, não
  existia (só havia `Sheet`, painel lateral).
- **`StatusBadge`** único — substitui as 48 ocorrências de cor de status
  escrita na mão (`text-success`, `bg-danger`...) encontradas na
  auditoria. Aplicado em Assistência (OS), Vendas, Orçamentos e
  Financeiro nesta rodada; os mapeamentos de status por domínio ficam em
  `utils/status-os.ts` e `utils/status-venda.ts`.
- **`PageHeader`** — título de página padronizado (a auditoria achou 4
  tamanhos de título diferentes sem critério). Aplicado em Clientes como
  referência.
- **`Pagination`** (via query string, mesmo padrão da busca de Clientes)
  — aplicada em Clientes; volume ainda pequeno nas outras listagens, mas
  o componente já está pronto pra quando fizer sentido.
- **Estados de carregamento**: `loading.tsx` em 9 rotas principais
  (Dashboard, Clientes, Estoque, Vendas, Assistência, CRM, Financeiro,
  Investidores, Consignação) usando `Skeleton` — componente existia desde
  o Sprint 0, nunca tinha sido usado em lugar nenhum.
- **Variante `success` no Button** — antes só existia `default` pra
  qualquer ação, inclusive "aprovar"/"concluir".
- **Saudação por horário no Topbar** ("Bom dia, Nhew") — calculada com
  fuso horário explícito de São Paulo (o servidor da Vercel roda em
  Washington, calcular sem isso dava saudação errada).
- **Busca rápida no cabeçalho** — atalho pra busca de Clientes que já
  existia, sem criar infraestrutura de busca nova.
- **`DESIGN_SYSTEM.md`** — guia de referência dos padrões (tipografia,
  cor de status, botões, cards, modais, layout de página), incluindo o
  que foi deliberadamente deixado de fora e por quê.

### Auditoria — o que foi encontrado e a decisão tomada
- Notificações reais, date picker customizado, busca global de
  verdade e ordenação de coluna em toda tabela foram avaliados e
  **deixados de fora de propósito** — todos exigiriam ou inventar dado
  que não existe, ou um esforço desproporcional pra uma etapa
  exclusivamente visual. Detalhado no `DESIGN_SYSTEM.md`.

---

## [Fase 19] — UX/UI premium: Clientes, Assistência, Estoque, CRM

### Clientes
- Busca por nome, telefone, CPF **e e-mail** (antes só nome/telefone),
  com filtros de nível (Normal/VIP) e origem — tudo via query string
  (`?busca=...&nivel=...&origem=...`), sem estado de cliente escondido:
  resultado é compartilhável e volta certo se der F5.

### Assistência Técnica
- Migração `fase18_diagnostico_inicial_estoque_minimo.sql`: campo
  **Diagnóstico Inicial** — terceiro nível, separado de `defeito`
  (relato do cliente) e `diagnostico` (avaliação técnica pós-abertura).
  Capturado na abertura da OS, visível o tempo todo na tela de detalhe e
  na impressão.
- **Página de detalhe da OS redesenhada por completo**: cabeçalho com
  controle de status embutido (antes só dava pra mudar status pelo
  Kanban — bug de fluxo real, corrigido) e indicação do próximo passo
  ("Próximo passo: Definir o orçamento do reparo"); coluna principal com
  a "história" do reparo em ordem (defeito → diagnóstico inicial →
  diagnóstico técnico); sidebar com aparelho, cliente (com link) e
  prazos/garantia sempre visíveis sem rolar a tela; checklists de
  recebimento/entrega viraram abas em vez de dois cards competindo por
  espaço.
- `STATUS_OS_OPTIONS` virou fonte única (`utils/status-os.ts`) — Kanban e
  página de detalhe usavam listas duplicadas antes.
- Confirmado por auditoria: **não existia** "Checklist de Entrega" na
  abertura da OS pra remover — só existe "Checklist de recebimento" ali.
  O checklist de entrega sempre foi exclusivo da tela de detalhe.

### Estoque
- Migração inclui `produtos.estoque_minimo` — limite definido
  manualmente (a quantidade em si continua **calculada**, nunca
  armazenada solta, mesmo princípio de sempre).
- Tabela de produtos agora mostra quantidade atual (com destaque visual
  quando abaixo do mínimo), estoque mínimo, custo, preço de venda e
  **lucro** (calculado, só visível pra quem já via custo).
- **Entrada em lote** (`/estoque/entrada-lote`): lança vários produtos de
  uma vez ao receber mercadoria, sem abrir cadastro por item. Custo
  unitário informado atualiza o catálogo junto (reflete preço novo do
  fornecedor).

### CRM
- "Nova oportunidade" virou botão de destaque (`size="lg"`), abre um
  painel lateral em vez de ocupar espaço fixo na tela o tempo todo.
- Follow-ups pendentes virou **aba própria**, com badge de contagem
  (conta atrasados + hoje — "o que precisa de atenção agora"). Categoriza
  em Atrasados (destacados em vermelho), Hoje e Próximos — antes só
  mostrava "hoje", achados em atraso ficavam invisíveis.

---

## [Fase 17] — Bug crítico: loop de redirecionamento no Portal do Cliente

### Corrigido
- **`/portal/login`, `/portal/cadastro` e `/portal/trocar-senha` estavam
  dentro da mesma pasta que o layout protegido do Portal.** Isso significa
  que o layout que exige sessão válida (`(portal)/portal/layout.tsx`)
  também envolvia essas três páginas — que existem justamente para quem
  NÃO tem sessão ainda. Resultado: visitar `/portal/login` sem estar
  logado disparava `redirect("/portal/login")` pro próprio layout,
  gerando um loop infinito. Mesmo problema em `/portal/trocar-senha`
  (redirecionava pra si mesma quando `senha_provisoria` era `true`).
  Isso explica o "clico e não vai pra lugar nenhum" — a página nunca
  chegava a terminar de carregar.
- **Correção**: as páginas protegidas (`dashboard`, `ordens`, `compras`,
  `cashback`, `garantias`, `historico`, `notificacoes`, `perfil`) foram
  movidas para dentro de um route group `(protegido)` — mesmas URLs
  (`/portal/dashboard` etc., route group não aparece na URL), mas agora
  só elas ficam sob o layout que exige sessão. `login`, `cadastro` e
  `trocar-senha` ficaram de fora, cada uma com a checagem que
  efetivamente faz sentido pra ela (`trocar-senha` agora faz sua própria
  checagem simples — só exige sessão, sem checar `senha_provisoria`,
  já que resolver isso é o propósito da própria tela).

### Nota
- Esse é o tipo de bug que só aparece testando o fluxo de ponta a ponta
  (clicar em "Portal do Cliente" a partir do zero, sem sessão) — não
  aparecia em nenhuma auditoria estática anterior porque o código de
  cada página, isolado, estava correto. O problema era só na composição
  das pastas.

---

## [Fase 16] — Hub de login reconstruído

### Alterado
- `/login` reconstruído do zero: nova ordem de prioridade (Portal do
  Cliente em destaque no topo, depois Consultar OS, Área da Equipe, e
  Loja Virtual por último) — reflete que o cliente logando é mais comum
  que a equipe usando esse hub.
- **Consultar Ordem de Serviço agora é um acordeão embutido na própria
  tela** — o formulário (`ConsultaOSForm`, já existente) abre inline ao
  clicar, sem navegar pra `/consultar-os`. A rota antiga continua
  existindo (não foi removida — pode ser útil como link direto vindo de
  fora, ex: QR code no balcão), só não é mais o caminho principal.
- **Loja Virtual aponta pro domínio externo** `neotecbrasil.com`, abre em
  nova aba. `/loja` (rota interna) virou um redirect de segurança pro
  mesmo domínio, caso algum link antigo aponte pra ela.
- Visual: cards com mais peso pro Portal do Cliente (maior, cor de marca),
  demais opções mais discretas — hierarquia visual reflete a nova ordem
  de importância.

### Auditoria
- Não foi encontrado bug de código nesta tela por leitura estática do
  componente anterior — todas as rotas referenciadas existiam e
  funcionavam. Reconstruída de qualquer forma, já que as mudanças
  pedidas (ordem, visual, formulário embutido) exigiam reescrita mesmo.

---

## [Fase 15] — PDV rápido, checklist embutido na criação da OS, padrão de desenho

### Adicionado
- Migração `fase14_venda_sem_cliente.sql`: `vendas.cliente_id` agora é
  opcional (venda de balcão, sem cliente vinculado). Trigger de timeline
  ajustado pra pular a gravação quando não há cliente.
- **PDV rápido** (`/vendas/pdv`): carrinho com múltiplos itens (aparelho
  do estoque + produtos/acessórios misturados na mesma venda), cliente
  opcional, forma de pagamento, desconto. Reaproveita o mesmo padrão de
  efeitos colaterais da venda por orçamento (baixa estoque item a item,
  gera financeiro, gera garantia se aplicável) — só que para N itens de
  uma vez. Dashboard → "Nova Venda" aponta pra cá agora.
- **"Novo orçamento" virou opção separada**, ao lado do PDV na página de
  Vendas — deixou de ser o único caminho pra vender.
- Checklist de recebimento (com a senha) agora é preenchido **na mesma
  tela de criação da OS**, não numa etapa separada depois. O checklist
  na página de detalhe continua existindo — serve pra completar/corrigir
  depois, não é mais o único lugar de preenchê-lo.
- `PatternLockPad`: grade 3x3 de pontos pra registrar o padrão de
  desenho da senha (estilo Android), com suporte a mouse e toque
  (Pointer Events — funciona igual em desktop e celular). Puramente de
  referência pro técnico, não valida nem trava nada.
- Migração `fase13_tipo_senha_aparelho.sql` (retomando a numeração):
  `checklist_os.senha_tipo` (numérica ou desenho).

### Notas de implementação
- O PDV chama a Server Action passando um objeto tipado direto (não
  `FormData`) — carrinho dinâmico com N itens não se beneficiaria do
  padrão de formulário estático usado no resto do projeto.

---

## [Fase 13] — Correção do bug de clientes, senha da OS, investidor x aparelho, login

### Corrigido (bugs reais, confirmados no código)
- **Clientes: linha da lista sem link.** Era isso — não tinha nada a ver
  com permissão/RLS como eu vinha suspeitando. `ClientesTable` nunca
  teve `<Link>` nem `onClick` nas linhas; clicar num cliente literalmente
  não fazia nada. Corrigido; auditoria rápida nas outras tabelas do
  sistema não achou o mesmo problema em nenhuma outra (vendas e
  aparelhos já tinham o link certo).
- **"Esqueci minha senha" era um botão morto** — sem `onClick`, sem link,
  desde a primeira versão da tela de login. Implementado o fluxo
  completo: `/login/equipe/recuperar` (pede e-mail, chama
  `resetPasswordForEmail`) → e-mail com link → `/login/equipe/redefinir-senha`
  (nova senha). Precisa de `NEXT_PUBLIC_SITE_URL` configurada (nova
  variável de ambiente, documentada no `.env.local.example`).
- **Login da equipe não verificava se a conta era da equipe** — só o
  portal tinha essa checagem (Fase F). Agora simétrico: login que só
  existe pro Portal do Cliente não entra mais na área da equipe.
- **Investidor vinculado a aparelho: schema pronto desde a Fase 6, campo
  sumido da tela.** `investidor_id` sempre existiu no formulário de
  aparelho a nível de dado — só faltava o `<Select>` de verdade.
  Adicionado, além de uma forma de vincular um aparelho **já existente**
  a um investidor direto da página dele (`listarAparelhosSemInvestidor` +
  `vincularAparelhoAoInvestidor`).
- 2 `console.log` de depuração esquecidos no webhook do WhatsApp — um
  deles logava o payload inteiro (telefone e conteúdo de mensagem de
  cliente) nos logs da Vercel. Removidos; `whatsapp_logs` já cobre isso
  de forma estruturada.

### Adicionado
- Migração `fase13_tipo_senha_aparelho.sql`: `checklist_os.senha_tipo`
  (numérica ou padrão de desenho) — checklist de recebimento agora
  distingue os dois tipos, não só um campo de texto genérico.

### Auditoria de código (pente fino)
- Todas as Server Actions (`*.actions.ts`) chamam `revalidatePath` — sem
  ação órfã deixando tela desatualizada.
- Nenhum outro botão sem `onClick`/`asChild` encontrado além do já corrigido.
- **Gaps de produto identificados, não corrigidos ainda** (fora do escopo
  desta rodada, ficam pra próxima se fizer sentido): `orcamentos-table.tsx`
  e `produtos-table.tsx` não têm link de linha porque **não existe página
  de detalhe** pra orçamento nem pra produto do catálogo — diferente do
  bug de clientes, aqui não tem link porque não tem pra onde ir ainda.

---

## [Fase 12] — Botões por cargo, OS com cadastro embutido, Pipeline ligado às conversas

### Adicionado
- Migração `fase12_os_aparelho_descricao.sql`: `ordens_servico.aparelho_descricao`
  (texto livre) — cobre o caso mais comum de assistência técnica (aparelho
  é do CLIENTE, não do estoque da loja). `aparelho_id` continua existindo
  e opcional, pro caso de conserto em item do próprio estoque antes de
  revender.
- Nova OS: toggle "Cliente existente / Cliente novo" — cadastra o cliente
  ali mesmo, sem sair da tela, se ele ainda não existir.
- Pipeline: cada card mostra um ícone de conversa (com contador de não
  lidas) **só quando já existe uma conversa vinculada** — card criado
  manualmente sem contato por WhatsApp não tem indicador, por decisão
  explícita (não faz sentido linkar pra lugar nenhum).
- "Follow-ups pendentes" do Pipeline agora mescla `crm_followups` com os
  Retornos **só de hoje** (`listarRetornosDeHoje`) — a agenda completa
  continua em `/crm/retornos`, sem filtro de data.

### Corrigido
- Botões grandes do dashboard agora são filtrados por cargo — Técnico não
  vê mais "Nova Venda", por exemplo. Mesmo princípio já aplicado à
  sidebar na Fase 10, faltava aplicar aqui também.

---

## [Fase 11] — Autocadastro do Portal + senha do aparelho na OS

### Adicionado
- Migração `fase11_senha_aparelho_os.sql`: coluna `checklist_os.senha_valor`
  (texto) — antes só existia `senha_informada` (boolean, sem guardar o
  valor). Campo visível só no checklist de recebimento (não faz sentido
  capturar de novo na entrega).
- `/portal/cadastro`: autocadastro do cliente no Portal. Vincula
  automaticamente a um cadastro já existente se o WhatsApp ou CPF
  informado bater com um cliente que já comprou na loja antes de ter
  portal — só preenche campos vazios, nunca sobrescreve dado que a loja
  já tinha. Se ninguém bater, cria cliente novo. Diferente do fluxo
  assistido pela equipe (Fase F): aqui o cliente escolhe a própria senha,
  não recebe senha provisória (não faz sentido forçar troca de uma senha
  que ele mesmo definiu).
- Link "Não tenho conta" na tela de login do Portal.

### Investigado (aguardando confirmação)
- Relato de "cliente sem informação" e "cashback não aparece": código
  revisado linha a linha, estrutura está correta. Duas hipóteses em
  aberto — cliente de teste sem histórico real (comportamento esperado)
  ou possível dessincronia de `loja_id` entre `usuarios` e
  `clientes`/`vendas` pós multi-tenant (Fase 3). Query de diagnóstico
  fornecida separadamente; fix será aplicado assim que confirmado.

---

## [Fase 10] — Consolidação CRM/Comunicação + Reorganização de navegação + Refinamento visual

### Removido
- Funil antigo por completo: coluna `conversas.etapa_funil`, enum `etapa_funil`
  (migração `fase10_remover_funil_antigo.sql`), `funil-kanban.tsx`,
  `conversa-card.tsx`, `moverConversaEtapa`/`moverConversaEtapaAction`.
  Decisão do dono do produto: apagar, não aposentar — os dois funis
  paralelos geravam confusão real de uso (CRM parecia parado porque a
  automação de mensagens alimentava só o Pipeline).
- Campo `leadsNovos` do dashboard (contagem morta, baseada no funil
  removido e nunca renderizada na tela — `comunicacao.novosLeads` já
  cobria esse número, calculado a partir de `crm_cards`).

### Alterado
- `/crm` agora É o Pipeline configurável (antes em `/comunicacao/pipeline`)
  — 13 etapas, cards, follow-ups. `/comunicacao` ficou só com conversas.
- `services/crm/crm.service.ts` e `crm.actions.ts`: mantidos (nome do
  arquivo preservado para não gerar churn de import sem necessidade
  técnica real), mas o escopo agora é só a agenda de retornos.
- Sidebar reescrita: agrupada em 4 seções (Relacionamento / Operação /
  Gestão / Sistema) e **filtrada por cargo** — Vendedor e Técnico não
  veem mais Financeiro, Investidores, Consignação, Analytics ou
  Configurações no menu (antes apareciam mesmo sem conseguir usar,
  porque o RLS bloqueava o dado mas o item continuava visível).
  `Sidebar`, `MobileNav`, `BottomNav` agora recebem `cargo` como prop.
- Aba Conversas do Cliente 360°: badge trocado de `etapa_funil`
  (removido) para `temperatura`.

### Refinamento visual
- `Card`: raio maior (14px → 16px), sombra mais suave e difusa, borda
  em opacidade reduzida (`border-border/70`), padding interno maior
  (p-5 → p-6), token `shadow-card-hover` novo para estados interativos.
- `Table`: cabeçalho em caixa alta com tracking, células com mais
  respiro (p-4 → px-5 py-3.5), hover de linha mais sutil.
- `IndicadorCard`, `StatCard`, `ActionButton`: ícones em container maior
  (`rounded-lg` em vez de `rounded-md`), micro-interação de elevação no
  hover para itens clicáveis (`hover:-translate-y-0.5` + sombra), sem
  alterar os itens não-clicáveis (não faz sentido dar affordance de clique
  em algo que não é clicável).
- Espaçamento geral: padding da área de conteúdo no desktop (p-6 → p-8),
  mais respiro de tela — parte do objetivo de aparência premium.

---

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
