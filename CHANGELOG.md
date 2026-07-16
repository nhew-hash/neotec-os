# Changelog — Neotec OS

Todas as mudanças relevantes do projeto, por fase de desenvolvimento.

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
