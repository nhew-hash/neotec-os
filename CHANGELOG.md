# Changelog — Neotec OS

Todas as mudancas relevantes do projeto, por fase de desenvolvimento.

# Changelog - Neotec OS

## [Fase 175] - CRITICO: IA citava preco de item nao publicado + resposta ia pro cliente errado

### Bug 1 (grave) - preco de item nao publicado
A busca de preco da IA nunca checava se o item estava PUBLICADO na
loja (`disponivel_loja_virtual`/`visivel_loja`) - so olhava se estava
"disponivel" no estoque interno. Por isso um iPhone 11 que nem estava
publicado no site pode ter side citado com um preco de teste/rascunho
(R$700). Corrigido nos 3 lugares (aparelhos, produtos genericos,
catalogo de lacrados) - agora so cita preco de item que o cliente
realmente consegue ver e comprar no site.

### Bug 2 - "a partir de" nao ficava claro
Quando um modelo tem varias variantes de preco diferente (cores/
armazenamento), o contexto so listava os precos sem instrucao clara -
a IA podia citar qualquer um da lista como se fosse o principal.
Corrigido: contexto agora calcula e destaca explicitamente "a partir
de RX" (o menor valor) quando ha mais de uma variante.

### Bug 3 (grave) - resposta do dono ia pro cliente errado
Achado: o status "expirada" existe na tabela de perguntas desde a
Fase 44, mas NUNCA foi usado - perguntas antigas ficavam acumulando
pra sempre. A fila e FIFO simples (sempre pega a mais antiga) - se
sobrava uma pergunta velha esquecida na fila, a resposta do dono pra
uma pergunta NOVA podia ir pra essa pergunta antiga (e cliente
errado), enquanto o cliente de verdade nunca recebia resposta nenhuma.

Corrigido: perguntas com mais de 3h sem resposta expiram sozinhas
(tanto quando o vendedor manda mensagem nova, quanto todo dia via
cron) - e o cliente que ficou esperando uma pergunta expirada tem a
conversa despausada automaticamente, pra IA voltar a atender em vez
de deixar ele travado pra sempre.

---

# Changelog - Neotec OS

## [Fase 174] - IA agora cita parcelamento real e sempre frisa "valor do site"

Confirmando sua pergunta: a busca ja cobria estoque (seminovo),
produtos genericos, lacrados (catalogo mestre) e cotacoes de
fornecedor - mas so trazia o preco a vista, nunca parcelamento.

### Adicionado
- Parcelamento calculado pelo MESMO motor de preco do site (Pricing
  Engine) - a Iara agora pode dizer "R$ 2.999 a vista, ou em ate 10x
  sem juros", com dado real, nao inventado.
- Prompt reforcado: toda vez que citar preco, deixa explicito que e o
  valor do site (neotecbrasil.com) - reforca confianca e direciona pro
  fechamento la.

---

# Changelog - Neotec OS

## [Fase 173] - Log de diagnostico na comparacao de numero do vendedor

Numero confirmado certo no banco (34933001898), e a logica de
comparacao parece correta no codigo tambem. A Bridge (que formata o
telefone antes de mandar pra ca) e um repositorio separado que nao
tenho acesso pra revisar - entao, em vez de continuar tentando
adivinhar o formato exato que ela manda, adicionei um log detalhado
nesse ponto exato da comparacao.

Na proxima vez que "ela trata como cliente" acontecer, procura no log
do Vercel por "Comparacao vendedor" - vai mostrar o telefone bruto que
chegou, o normalizado, o numero configurado, e se bateu ou nao. Isso
da o dado real pra resolver de vez, em vez de eu ficar chutando.

---

# Changelog - Neotec OS

## [Fase 172] - IA de atendimento (Iara): busca de preco mais robusta + prompt atualizado

### Bug real achado
A busca de preco juntava TODAS as palavras da mensagem do cliente num
termo so (ex: "iphone 13 cor preta") e buscava isso como um bloco
inteiro no banco. Se o cliente usava qualquer palavra que nao fazia
parte do nome exato do produto, a busca inteira falhava - a IA achava
que "nao encontrou preco" e escalava pro vendedor, mesmo quando o
produto existia e tinha preco cadastrado. Isso explica boa parte do
"toda hora me manda mensagem pra perguntar".

### Corrigido
Busca agora e progressiva: tenta o termo completo, e se nao achar, vai
reduzindo uma palavra por vez ate achar algo. Fallback final tenta
especificamente a palavra com numero (geralmente o modelo, tipo "13",
"15 pro"), pra quando a ordem das palavras do cliente atrapalha.

### Prompt atualizado
`configuracoes_ia.prompt_sistema` atualizado com a versao completa e
revisada da Iara (personalidade, regras de venda, fechamento,
objecoes, transferencia pra humano, tudo).

### Sobre "ela me trata como cliente"
Revisei o codigo que decide se uma mensagem recebida e do vendedor
(configuracoes_ia.numero_vendedor_perguntas) respondendo uma pergunta
da IA, ou de um cliente novo - essa logica ja tem protecao correta no
codigo (sempre separa certo, independente de ter pergunta pendente ou
nao). Isso sugere que o numero configurado pode nao ser exatamente o
mesmo que voce usa pra responder - mandei uma consulta de diagnostico
(`diagnostico-numero-vendedor.sql`) pra confirmar qual numero esta
cadastrado.

---

# Changelog - Neotec OS

## [Fase 171] - Logo com fallback automatico - nunca mais icone quebrado

Nao consegui identificar com certeza a causa exata de por que a logo
falha em carregar especificamente no mobile (testado em 2 aparelhos
diferentes, mesmo em navegacao anonima, mesmo digitando o dominio
direto - nao achei nada no codigo, config, CSP ou service worker que
explicasse isso).

### Solucao aplicada
Em vez de continuar so tentando diagnosticar as cegas, tornei a UI
resiliente: se a imagem falhar por qualquer motivo, o cabecalho e
rodape caem automaticamente pro texto "Neotec" (o visual original,
antes da logo em imagem) - nunca mais mostra icone de imagem quebrada,
seja qual for a causa real do carregamento falhar.

### Ainda em aberto
A causa raiz do carregamento falhar no mobile continua sem explicacao
clara. Se sobrar tempo, vale investigar mais fundo (talvez com acesso
a print de tela ou ferramenta de inspecao remota) - mas o fallback ja
garante que o site nao fica com aparencia quebrada enquanto isso.

---

# Changelog - Neotec OS

## [Fase 170] - Logo protegida contra encolhimento no mobile

Achado: a logo nao tinha protecao contra ser espremida pelo layout
flex do cabecalho no mobile (varios icones competindo por espaco -
menu, busca, carrinho, usuario). Adicionado `shrink-0` na logo e no
link que a envolve - nunca mais encolhe, nao importa quanto espaco
sobrar. Altura tambem ajustada pra ficar mais legivel no mobile (36px
no celular, 32px a partir de tablet/desktop).

---

# Changelog - Neotec OS

## [Fase 169] - Catalogo de lacrado nunca mostrava foto - achado real

### Causa
A funcao que lista os modelos na GRADE do catalogo ainda buscava foto
na coluna antiga `catalogo_lacrados_modelos.fotos` - coluna que ficou
obsoleta desde a Fase 107, quando a vinculacao de foto passou pra
nivel de VARIANTE (nao modelo). Por isso a grade nunca mostrava foto -
buscava no lugar errado. A pagina de produto individual ja buscava
certo (na variante), por isso funcionava la - e isso explica o "umas
esta certo, outras nao" que voce descreveu.

### Corrigido
Grade agora busca foto de QUALQUER variante do modelo que ja tenha
grupo de imagem vinculado - mesma logica de reserva ja usada na
pagina de produto individual desde a Fase 147, aplicada aqui tambem.

---

# Changelog - Neotec OS

## [Fase 168] - "produto/null" corrigido, e protegido pra nunca mais acontecer

### Causa
O SQL de insercao do estoque comercial (33 acessorios) nao gerou
slug - ficou null, e o link da loja virou literalmente
"/loja/produto/null".

### Corrigido em 3 frentes
1. **Dados existentes** - os 33 produtos ja inseridos ganham slug
   automatico (nome + pedaco do ID, mesmo padrao ja usado no resto do
   sistema).
2. **Gatilho no banco** - agora QUALQUER produto criado sem slug
   (SQL direto, formulario, importacao, qualquer caminho futuro)
   ganha um automatico na hora - nao depende mais do codigo da
   aplicacao lembrar de gerar.
3. **7 pontos no codigo protegidos** - nenhum link de produto na loja
   monta a URL sem checar se o slug existe primeiro (produto-card,
   busca, comparar, vistos recentes, encontre-seu-iphone).

---

# Changelog - Neotec OS

## [Fase 167] - iPad nunca mais vira lacrado, nem aparece em iPhone Lacrado

### Causa
iPad foi classificado como "lacrado" por engano (regra ja dizia pra
nao fazer isso, mas a IA nem sempre segue) - e como lacrado usa marca
"Apple" igual iPhone, ele foi parar dentro da area "iPhone Lacrado" na
loja (o filtro so olhava marca, nao o nome do modelo).

### Corrigido
- Trava deterministica no codigo: iPad nunca pode virar "lacrado",
  sempre corrige pra "generico" - nao depende so da IA acertar.
- Area "iPhone Lacrado" na loja agora filtra por marca=Apple E nome
  contendo "iPhone" - protege contra qualquer outro item Apple
  (iPad, e qualquer coisa futura) aparecer ali por engano.

---

# Changelog - Neotec OS

## [Fase 166] - Lucro agora vale pra generico tambem (Apple Watch, JBL, PS5...)

Achado com o exemplo real da lista de Apple Watch: item classificado
como "generico" (unico, sem variante tipo iPhone) nunca tinha lucro
calculado - a regra so cobria seminovo e lacrado ate a Fase 130.

### Corrigido
- Regra de lucro agora vale pra qualquer destino (seminovo, lacrado,
  generico) - Apple Watch, JBL, PS5, acessorio Apple, tudo passa a
  ter preco sugerido com margem.
- Tela de revisao mostra o campo editavel com lucro pra todo item
  agora, nao so seminovo/lacrado.
- Mesmo bug ja corrigido antes pra lacrado (Fase 130) tambem existia
  pra generico - o botao de aplicar salvava o preco PAGO cru, ignorando
  a margem. Corrigido, agora usa o preco editavel de verdade.
- Codigo morto removido (`{true ? ... : ...}`) que sobrou da mudanca.

---

# Changelog - Neotec OS

## [Fase 165] - IA de cadastro: preco diferente por cor tambem em lacrado

A regra ja existia pra seminovo (com bateria %), mas faltava exemplo
especifico pra lacrado - lista real trazida como exemplo:
"17 256g preto/branco/azul a 5050, verde a 4899" (preco diferente por
grupo de cor, sem bateria envolvida). Adicionado exemplo direto no
prompt, mais uma nota sobre espacamento inconsistente ("pro256g" sem
espaco) nao confundir a leitura de modelo/memoria.

---

# Changelog - Neotec OS

## [Fase 164] - Revisao profissional de TODOS os documentos de impressao

Pedido explicito de revisar tudo, nao so o que ja tinha mexido.

### Bugs reais achados e corrigidos
- Orcamento (A4) e Venda (cupom) usavam `{{itens}}` (escapado) em vez
  de `{{{itens}}}` (HTML cru) - a lista de itens formatada nunca
  funcionou direito, apareceria com tags visiveis tipo texto cru.
- Dominio errado (`neotecos.vercel.app`) ainda estava espalhado em 4
  lugares dentro de orcamento.service.ts e venda.service.ts (o mesmo
  bug ja corrigido em outros lugares nas Fases 133/135, mas esses dois
  arquivos tinham logica de QR duplicada em vez de reusar o helper
  correto - agora reusam).
- Nome da empresa inconsistente ("NEOTEC ARAGUARI" em 4 lugares vs o
  nome fiscal completo usado no comprovante) - padronizado em todos.

### Profissionalizado
CNPJ real adicionado em TODOS os documentos que ainda nao tinham (OS
cupom, orcamento A4, venda cupom, recibo cupom) - so o comprovante de
aparelho (Fase 158) tinha isso ate agora.

### Documentos NAO alterados (cupom termico e assim mesmo por design)
Os cupons continuam compactos/monoespacados (Courier New, 280px) -
isso e proposital, papel termico de 80mm nao comporta letterhead
completo. "Profissional" ali significa dado correto e completo, nao
virar A4.

---

# Changelog - Neotec OS

## [Fase 163] - Central de Cadastro: aparelho nasce como "fornecedor" na localizacao

Achado: a palavra "fornecedor" tinha dois significados diferentes no
sistema agora - origem_entrada='fornecedor' (veio do Central de
Cadastro) e localizacao_estoque='fornecedor' (fisicamente fora da
cidade, Fase 160). Aparelho do Central de Cadastro nascia com
localizacao_estoque='loja_fisica' por padrao, o que nao faz sentido
(acabou de vir de lista de fornecedor, provavelmente ainda nao chegou
fisicamente).

Corrigido: agora nasce como "fornecedor" na localizacao. Como esses
itens ja publicam direto na loja virtual (Fase 97), esse campo so fica
visivel de verdade se um dia o item for despublicado - nesse caso, cai
certo na aba "Fornecedor" em vez de "Loja Fisica" por engano.

---

# Changelog - Neotec OS

## [Fase 162] - Estoque Comercial: descoberta, nao precisou construir

Ia adicionar um campo novo de quantidade em produtos + revincular no
PDV, ate descobrir que isso JA EXISTIA (de uma fase anterior sem
visibilidade completa nesta sessao): a aba "Estoque Comercial" ja
esta la, `movimentos_estoque` ja registra entrada e saida, e uma view
(`vw_produtos_saldo`) ja calcula o saldo real automaticamente em cima
disso. Ja tinha alerta de estoque baixo, tudo funcionando.

Revertido tudo que eu tinha comecado a criar (evitou duplicar/
conflitar com o que ja funcionava). Nenhuma mudanca de codigo nesta
fase - so a descoberta e a reversao segura.

---

## [Fase 161] - PDV: modo de venda + cadastro rapido de aparelho + comprovante

### Modo de venda no PDV
Dois botoes no topo: "Venda rapida" (esconde busca de aparelho -
so produto/acessorio de giro rapido) e "Venda de aparelho" (mostra
tudo, aparelho + produto juntos, exatamente como o carrinho ja
suportava por baixo - so ficou mais claro visualmente qual e qual).

### Cadastrar aparelho direto na venda
Botao novo, so no modo "Venda de aparelho" - abre um formulario
compacto (modelo, categoria, IMEI, cor, memoria, bateria, condicao,
preco). Busca ou cria o produto automaticamente pelo nome, cria o
aparelho, e adiciona direto no carrinho - sem precisar ir em Estoque
cadastrar antes. Cadastro rapido nao pede custo (fica pra ajustar
depois em Estoque se precisar do controle de lucro completo).

### Comprovante de venda A4 conectado
Pagina de detalhe da venda ganhou o botao "Comprovante A4" (o
documento completo da Fase 158) - so aparece quando a venda tem
aparelho.

---

# Changelog — Neotec OS

Todas as mudanças relevantes do projeto, por fase de daenvolvimento.

## [Fase 102] — Upload de fotos reais em produtos e aparelhos

Antes: nenhum item (produto ou aparelho) tinha campo de foto — a loja
sempre mostrava um ícone genérico. Isso é infraestrutura pra fotos DE
VERDADE (suas, do seu estoque) — não fiz nem farei busca/download de
foto oficial de fabricante pra uso comercial, isso é fora do que eu
faço independente de quem assume a responsabilidade jurídica depois.

### Adicionado
- `produtos.fotos` e `aparelhos.fotos` — array de URLs, primeira é a
  capa. Bucket próprio `produtos-fotos` (público, leitura sem sessão).
- **Upload de foto** — `/estoque/aparelhos/[id]` (já existia, só
  faltava foto) e `/estoque/produtos/[id]` (página nova — não existia
  detalhe de produto nenhum antes). Múltiplas fotos, marca a capa,
  remove individualmente.
- **Loja mostra a foto real** — card de produto e página de produto
  (PDP), com fallback pro ícone genérico quando não tem foto ainda.

### Limitação conhecida
Não estendi ainda pra página de lacrado (`/loja/lacrados/[modelo]`) —
lacrado usa o catálogo mestre por variante, não teria uma foto "por
unidade" fácil de encaixar sem repensar a estrutura. Fica pra próxima,
se fizer sentido pra você.

---

## [Fase 101] — Corrigido em 3 lugares: cliente duplicado por WhatsApp

### Causa
`clientes.whatsapp` tem restrição de unicidade — 3 pontos diferentes
do sistema criavam cliente sem tratar o caso de já existir um com
esse WhatsApp, estourando o erro cru do banco direto pro usuário.

### Corrigido
- **`criarCliente`** (service compartilhado — usado por vários
  fluxos): se der duplicidade, busca e devolve o cliente que já
  existe, em vez de quebrar.
- **Automação de WhatsApp** (`whatsapp.automacao.ts`): duas mensagens
  quase simultâneas do mesmo número novo podiam gerar corrida — agora,
  se acontecer, busca o cliente que a outra chamada acabou de criar,
  em vez de derrubar o processamento do webhook inteiro.
- **Autocadastro no Portal** (`portal.service.ts`): duplo-clique ou
  duas abas abertas no cadastro podiam deixar um usuário de
  autenticação órfão (criado, mas nunca vinculado a nenhum cliente) —
  agora vincula ao cliente que já existe nesse caso.

---

## [Fase 100] — diagnostico_inicial, terceira vez (Fases 18 → 56 → 100)

### Investigação
Não achei nenhuma migração que derruba a coluna ou a tabela —
nenhum "drop column"/"drop table" em `ordens_servico` no histórico
inteiro. Não é um bug reintroduzido pelo código.

### Explicação mais provável
As Fases 18 e 56 nunca chegaram a rodar de verdade nesse banco
específico — banco recriado do zero, restaurado de um snapshot
anterior à Fase 18, ou uma migração pulada na sequência.

### O que essa migração faz
- `add column if not exists` — garante a coluna, idempotente.
- `notify pgrst, 'reload schema'` — cobre o outro cenário possível
  (coluna existe, mas o cache de schema do PostgREST está
  desatualizado — comum depois de alteração via SQL Editor).

### Recomendação
Depois de rodar essa, sugiro conferir no Supabase (Database → 
Migrations, ou uma query em `information_schema.columns`) se as
migrações anteriores realmente foram todas aplicadas em ordem —
evita esse mesmo erro reaparecer numa quarta vez com outra coluna.

---

## [Fase 99] — Loja Virtual unificada — um lugar só pra conferir tudo publicado

### O gap real
Verifiquei o dado no banco (seminovo, lacrado, genérico) — tudo
estava correto e realmente publicado. O problema era outro: a aba
"Loja Virtual" só mostrava APARELHOS (seminovo) — lacrado e produto
genérico nunca apareciam ali, cada um só existia na sua própria tela
separada. Fácil de concluir "não foi pra lá" mesmo estando tudo certo.

### Corrigido
Nova aba **"Loja Virtual (tudo publicado)"** em Estoque — primeira
aba, em destaque — junta as 3 fontes:
- Seminovo (`aparelhos` com `disponivel_loja_virtual = true`)
- Lacrado (`catalogo_lacrados_variantes` com `quantidade > 0`)
- Produto genérico (iPad, Mac, Watch, acessório com `visivel_loja = true`)

Cada linha tem um link "Ver na loja →" que abre a página pública de
verdade, pra conferir sem sair do admin.

---

## [Fase 98] — Correção: listas grandes cortando a resposta da IA no meio

### Causa raiz
`maxTokens: 4000` era baixo demais pra listas com muitos itens (o
relato tinha 30+ linhas de Android, com specs mais longas que iPhone —
armazenamento/RAM, 5G, NFC, edição especial). A resposta da IA vinha
cortada no meio do JSON, gerando "formato inesperado" mesmo com a
lista sendo válida.

### Corrigido
- `maxTokens` de 4000 → 12000 — margem confortável pra listas grandes.
- Mensagem de erro agora diferencia os dois casos: JSON cortado
  (sugere colar em partes menores) vs. dado realmente inválido.
- Log do erro de validação agora registra os primeiros problemas
  encontrados, ajuda a diagnosticar se acontecer de novo.

### Sobre "estoque loja virtual não tá indo pra lá"
Consequência do mesmo erro — como a classificação falhava antes de
qualquer item aparecer pra revisão, nada chegava a ser criado. Not a
bug separado; corrigindo a causa acima resolve os dois.

---


## [Fase 97] — Tudo cadastrado já nasce publicado, na categoria certa

Reversão intencional das Fases 92-95 (que faziam publicação manual de
propósito, por segurança) — agora é publicação automática, como pedido.

### Publicação automática
- `aplicarSeminovoFornecedorAction`: aparelho e produto-pai nascem
  publicados (`disponivel_loja_virtual`/`visivel_loja = true`), slug
  gerado na hora.
- `aplicarGenericoFornecedorAction`: mesmo comportamento, tanto criando
  produto novo quanto atualizando um que já existia sem estar publicado.
- Tela antiga (`seminovos.actions.ts`, ainda acessível por URL direta)
  corrigida igual, por consistência.
- Botão manual "Publicar na loja" na Central de Cadastro removido —
  não faz mais sentido, já que tudo nasce publicado.

### Bug real corrigido no caminho — categoria errada
`aplicarSeminovoFornecedorAction` recriava a categoria adivinhando
pelo nome ("tem 'iphone' no texto? então é iphone, senão android") —
ignorava a categoria que a IA já tinha classificado certo (podia ser
iPad, Mac, Apple Watch...). Corrigido: usa `item.categoria`, a mesma
que a IA de classificação já identificou.

### Lacrado já era automático
Lacrado não precisou de mudança — desde a Fase 66/67, aparece na loja
sozinho assim que a quantidade fica maior que zero, sem depender de um
campo de publicação separado.

---

## [Fase 96] — Pix é o preço principal, e botão de avaliar aparelho

### Correção de conceito — o preço cadastrado É o Pix
A Fase 88/93 tinha invertido isso sem perceber — tratava o preço
cadastrado como "vitrine" e calculava um Pix menor por cima. Voltado
ao que foi estabelecido desde a Fase 89: **o preço que você cadastra
é exatamente o que você quer receber no Pix**, sem recalcular nada em
cima dele. O motor de precificação agora só deriva o preço de
vitrine/cartão PRA CIMA a partir desse valor — nunca o contrário.

### Pix agora é o preço em destaque, não o menor
Redesenhado: bloco verde grande com o preço Pix como protagonista,
preço de cartão/vitrine menor do lado ("ou R$X no cartão"). Antes
estava invertido — vitrine grande, Pix pequeno.

### Botão "Avalie o seu aparelho" na página de produto
Link direto pro simulador de troca (`/loja/trade-in`, já existia desde
a Fase 60) — agora visível tanto na página de seminovo/genérico quanto
na de lacrado (onde faz até mais sentido — quem compra novo é quem
mais costuma dar o usado de entrada).

### Simplificação
Removido o método `calcularExibicaoComVitrineFixo` do motor (ficou
sem uso depois da correção de conceito) e o preço duplicado que
aparecia junto com o novo destaque nas duas telas de produto.

---

## [Fase 95] — Central de Cadastro: auto-criar variante, publicar direto, lucro sempre aplicado

### 1. Lacrado com combinação nova não existia mais erro
Antes: fornecedor oferece um armazenamento/cor que o catálogo mestre
ainda não tinha → erro "variante não encontrada", travava o cadastro.
Agora: cria o modelo e/ou a variante na hora, automaticamente — nunca
mais trava por isso.

### 2. Publicar direto na Central de Cadastro
Depois de aplicar um item seminovo, aparece o botão **"Publicar na
loja"** na hora, sem precisar ir pra outra tela (Estoque → Loja
Virtual). Continua sendo um clique manual, de propósito — nunca
publica sozinho sem confirmação.

### 3. Lucro zero silencioso — causa raiz achada e corrigida
Instalação nova nunca tinha regra de lucro nenhuma cadastrada (a Fase
80 só criou a tabela). Resultado: todo item saía com preço de venda
igual ao preço pago, lucro zero, sem avisar ninguém.
**Migração `fase95_regra_lucro_padrao.sql`** semeia uma regra padrão
de 15% — só insere se a loja não tiver nenhuma regra ainda, não
sobrescreve nada configurado.

### 4. Categoria mais precisa, menos bagunça
Prompt da IA reescrito com regra explícita por categoria (o que É e o
que NÃO É cada uma) — acessório de marca não-Apple sempre cai em
"acessorio" com a marca certa, nunca mistura com celular/tablet/relógio
só por estar na mesma lista.

### 5. Telas antigas saíram do menu
"Lacrados" (gestão manual + IA antiga) e "Seminovos (IA)" — como
pedido, a Central de Cadastro por Fornecedor é agora o único caminho
visível no menu. Os arquivos continuam existindo (acessíveis por URL
direta), só não aparecem mais na navegação.

---

## [Fase 94] — Correção: /loja/produto/null

### Causa raiz
A correção anterior (Fase 93 — "publicar aparelho publica o produto-pai
junto") esqueceu de gerar o slug do produto ao publicar — produto
ficava visível mas sem endereço próprio, virando literalmente a string
"null" na URL.

### Corrigido
- `alternarPublicacaoLojaAparelhoAction` agora gera o slug (mesma
  lógica de `publicarProdutoLojaAction`) sempre que publica um produto
  que ainda não tinha um.
- **Migração `fase94_fix_slug_null.sql`** — corrige produtos que já
  ficaram publicados sem slug antes dessa correção (não depende da
  extensão `unaccent`, trata acento manualmente).
- Conferido que não existe mais nenhum outro lugar do código que
  publique produto sem gerar slug junto.

---


## [Fase 93] — Publicar de vez, e Pix/sem juros em destaque na loja

### Bug real do "publica e não aparece" — achado e corrigido
Depois da Fase 89 (publicação por aparelho individual), publicar um
aparelho e publicar o produto genérico viraram dois controles
separados. Produto auto-criado pela Central de Cadastro nasce com
`visivel_loja: false` — então mesmo publicando o aparelho, o
produto-pai continuava invisível, e nada aparecia na loja.
**Corrigido**: publicar um aparelho agora publica o produto-pai
automaticamente junto. Despublicar só esconde o produto-pai se não
sobrar nenhum outro aparelho publicado dele (não derruba unidades-irmãs
que continuam à venda).

### Pix e "sem juros" em destaque — sem precisar clicar
Antes, parcelamento só aparecia atrás de um "Ver opções de
parcelamento" — o pedido era ter isso visível na cara. Trocado por:
- Preço no Pix com desconto, em destaque verde, com selo de %.
- "Até Nx sem juros" em destaque azul — vem de dado real (tabela de
  taxas configurável, Fase 88), nunca "sem juros" assumido.
- Busca automática ao carregar a página (antes só buscava se
  clicasse) — cache de 1h no servidor evita sobrecarga.
- Aplicado nas duas telas de produto (seminovo/genérico e lacrado).

### Motor de precificação (Fase 88) agora tem 2 modos
- Produto com "preço líquido desejado" cadastrado → motor deriva o
  vitrine a partir dele (como já era).
- Produto SEM isso cadastrado (a maioria hoje) → novo método
  `calcularExibicaoComVitrineFixo()` — parte do preço de vitrine já
  existente, calcula Pix e parcelas em cima dele. Isso é o que fez o
  destaque funcionar pra loja inteira, não só pros poucos produtos que
  já tivessem o campo novo preenchido.

---

## [Fase 92] — 3 correções: produto não publica, delete perigoso demais, publicação explícita

### 1. "Publico e não aparece no site" — corrigido
Causa raiz: `revalidatePath("/loja")` só invalida a página inicial da
loja, não `/loja/categoria/[x]`, `/loja/produto/[slug]`, etc. Um
produto recém-publicado podia ficar "invisível" nessas páginas até o
cache expirar sozinho. Trocado por `revalidatePath("/loja", "layout")`
em TODOS os 7 arquivos que publicam algo na loja (marketing, CMS da
home, produtos, aparelhos, lacrados, precificação) — invalida a árvore
inteira, não só a página exata.

### 2. "Substituir lista" apagou quase tudo — ficou bem mais seguro
Depois do relato de que a substituição apagou a maioria dos aparelhos
inesperadamente durante teste: agora exige **digitar "APAGAR"**
explicitamente antes do botão de confirmar ficar habilitado — a prévia
sozinha (só mostrar o número) não era fricção suficiente pra evitar
confirmação sem pensar direito no tamanho do impacto.

### 3. Publicação nunca mais acidental — reforçado
Toda vez que a Central de Cadastro ou a tela de Seminovo (IA)
auto-cria um produto ou aparelho, `visivel_loja`/`disponivel_loja_virtual`
agora são fixados como `false` EXPLICITAMENTE no insert — nunca mais
dependendo do valor padrão do banco (que era o suspeito mais provável
do relato de aparelho aparecendo em "loja virtual" sem ter sido
publicado). Todo item novo exige clique manual em "Publicar" antes de
aparecer na loja, sem exceção.

### Recomendação
Como o ambiente ainda está em fase de teste (sem Point-in-Time
Recovery no Supabase), recomendo confirmar que os dados atuais são
mesmo descartáveis antes de continuar testando o "Substituir lista" —
mesmo com a fricção nova, é uma operação genuinamente destrutiva.

---

## [Fase 91] — Central de Cadastro: lista do fornecedor substitui a anterior

### Regra nova (destrutiva de propósito — como pedido)
Quando uma lista nova de fornecedor é colada e confirmada como
substituição, tudo que **não está** nela é apagado de verdade — o
raciocínio é que o fornecedor pode ter vendido esses aparelhos, então
não fazem mais sentido continuar oferecidos.

### Segurança tomada, dado que é uma operação destrutiva
- **Prévia obrigatória antes de apagar** — mostra "vai apagar X
  seminovo(s) e zerar Y variante(s) de lacrado" e exige confirmação
  explícita antes de executar qualquer DELETE.
- **Escopo restrito**: só apaga `aparelhos` com `origem_entrada = 'fornecedor'`
  E `status = 'disponivel'` — nunca toca em aparelho reservado, vendido,
  ou cadastrado manualmente fora da Central. Lacrado é diferente por
  natureza (não é unidade física possuída, é sempre dependente de
  fornecedor) — pode zerar quantidade de qualquer variante não
  presente na lista nova, com segurança.
- Botão de substituir é visualmente distinto (vermelho) do "Aplicar
  tudo" normal (que continua só adicionando/atualizando, nunca apaga).

### Outro ajuste pedido — filtro de memória inválida
Item com memória abaixo de 1GB é descartado automaticamente antes até
de aparecer na tela de revisão — geralmente é erro de leitura (emoji/
número confundido com capacidade), nunca é um dado real de produto.

---

## [Fase 90] — Correção de build: tipo genérico em salvarConfig do painel de precificação

### Corrigido
`precificacao-panel.tsx` — `salvarConfig` tinha `modo_juros?: string`
(genérico), mas a Server Action exige o union exato
`"repassar_juros" | "embutir_juros"`. Corrigido pra usar
`Partial<Pick<ConfiguracaoPrecificacao, ...>>`, o mesmo tipo que a
action espera.

---


## [Fase 89] — Publicação por aparelho individual + abas Loja Física/Virtual

### Problema real
Aparelho individual não tinha controle próprio de "publicado na loja"
— a visibilidade dependia só do produto genérico (`produtos.visivel_loja`),
então não dava pra escolher "esse iPhone específico fica só na loja
física, aquele outro vai pra online". Tudo que entrava pela Central de
Cadastro por Fornecedor virava aparelho de estoque, sem distinção.

### Corrigido
- **`aparelhos.disponivel_loja_virtual`** — campo próprio por unidade
  (migração preserva o que já estava publicado: todo aparelho cujo
  produto já tinha `visivel_loja = true` nasce já marcado).
- **Botão "Publicar"/"Na loja"** em cada linha da tabela de aparelhos
  — o que faltava, como você apontou.
- **Estoque → Estoque de Aparelhos** agora tem sub-abas: **Loja
  Física** (tudo — é o estoque real) e **Loja Virtual** (só o que
  está marcado como publicado) — visual, como pedido.
- Função pública da loja (`listar_aparelhos_disponiveis_loja`)
  atualizada pra filtrar pelo campo novo, por unidade — não mais pelo
  produto genérico inteiro.

### Comportamento
Aparelho cadastrado pela Central de Cadastro por Fornecedor nasce
**não publicado** — precisa clicar "Publicar" na aba Loja Virtual pra
aparecer no site, igual já funcionava pra produto genérico.

---

## [Fase 88] — Pricing Engine: motor de precificação (núcleo completo)

### O que está pronto e correto
- **`PricingEngine`** (`services/precificacao/pricing-engine.ts`) — classe
  única e reutilizável, sem taxa nenhuma fixa em código. Recebe a
  tabela de taxas e a configuração (modo de juros, desconto Pix) de
  fora, sempre. Matemática documentada linha a linha no próprio arquivo.
- **Configurações → Financeiro → Parcelamento**: tabela de taxas 100%
  editável (Pix + 1x a 12x, semeada com os valores do pedido), toggle
  "repassar juros" vs. "embutir juros", desconto Pix configurável.
- **Simulador ao vivo**: usa o MESMO `PricingEngine` da loja de
  verdade — muda uma taxa, tudo recalcula na hora (vitrine, Pix,
  cada parcela, lucro líquido se informar o custo).
- Campo `preco_liquido_desejado` adicionado em `produtos`, `aparelhos`
  e `catalogo_lacrados_variantes` — quando preenchido, é a partir dele
  que o motor calcula o preço de vitrine.

### Matemática implementada
- **Embutir juros**: `precoVitrine = precoLiquidoDesejado / (1 - maiorTaxa)`
  — um preço só, alto o suficiente pra sustentar parcelamento "sem
  juros" até a maior parcela cadastrada.
- **Repassar juros**: cada forma de pagamento tem seu próprio valor
  (`precoLiquidoDesejado / (1 - taxaDaForma)`) — quem parcela mais paga
  mais, a loja recebe o mesmo líquido não importa a forma escolhida.
- Desconto Pix sempre como camada comercial extra, por cima do preço-base.

### Importante — o que ainda NÃO está feito
**A exibição da loja (página de produto, carrinho) ainda não foi
trocada pra usar o motor** — hoje continua mostrando `preco_venda`
direto, como sempre mostrou. Essa integração toca vários componentes
já existentes (seletor de variante de seminovo, card de produto,
tabela de parcelamento da Fase 79) e as funções SQL públicas que eles
usam — decidi não apressar isso numa mesma entrega gigante pra não
arriscar quebrar o que já funciona. O motor em si está pronto,
testado e correto — falta só ligar os fios até a tela do cliente.

---

## [Fase 87] — Central de Cadastro por Fornecedor: os 4 ajustes pedidos

### 1. Lucro faltando — corrigido
A regra de lucro padrão (Fase 80) nunca era aplicada nos itens
classificados como seminovo — o preço da lista do fornecedor virava
direto o preço de venda, sem margem nenhuma. Agora: preço pago (da
lista) e preço de venda (calculado pela regra padrão, editável antes
de aplicar) aparecem separados, com o lucro mostrado ao lado.

### 2. IMEI obrigatório — corrigido
Migração `fase87_imei_opcional.sql`: `aparelhos.imei` deixa de exigir
preenchimento. Faz sentido pra cadastro em lote — o IMEI real muitas
vezes só é conhecido quando o aparelho chega fisicamente, não na hora
de registrar a lista de preço do fornecedor. Dá pra completar depois
editando o aparelho no Estoque. A constraint de unicidade continua
funcionando normal (Postgres nunca considera dois NULLs iguais entre
si numa unique constraint).

### 3. Confirmar um por um — corrigido
Botão **"Aplicar tudo"** — aplica todos os itens pendentes de uma vez
(em paralelo), cada card atualiza seu próprio status conforme termina.
Continua possível aplicar item por item também, se preferir revisar
com mais calma.

### 4. Item múltiplo mal identificado — corrigido
O exemplo "15 PRO MAX 256G🩶92% 85%⚫️ 4099" (cor ANTES do primeiro %,
diferente do padrão anterior) foi adicionado como exemplo explícito no
prompt, junto de um terceiro caso (preços diferentes por cor na mesma
linha) — a IA agora tem mais variação de formato pra reconhecer.

---

## [Fase 86] — Achada a causa real de "a IA fica me chamando toda hora"

### Causa raiz
A busca de preço da IA de Atendimento (`ia-atendimento-busca.service.ts`)
nunca foi atualizada depois que construímos o catálogo mestre de
Lacrados (Fase 66-67) e os produtos genéricos — iPad/Mac/Watch/
acessórios — via Central de Cadastro por Fornecedor (Fase 83). Ela só
enxergava `aparelhos` (seminovo) e o sistema antigo de cotações
manuais. A regra "nunca invente preço" da IA manda escalar pro
vendedor sempre que não acha preço nenhum — então toda pergunta sobre
lacrado, iPad, Mac, Watch ou acessório vinha vazia e disparava a
pergunta pro seu WhatsApp, mesmo com o dado já existindo no sistema.

### Corrigido
- Nova busca em `catalogo_lacrados_variantes` (só variante com
  quantidade > 0 e preço definido) — conectada na fonte "lacrados".
- Nova busca em `produtos` genéricos (iPad, Mac, Apple Watch,
  acessório) — conectada na fonte "estoque", junto do que já buscava
  em `aparelhos`.
- Fonte antiga de cotações (sistema manual, antes do catálogo mestre
  existir) mantida em paralelo, não removida — combina os dois em vez
  de substituir, pra não perder nenhum dado que já estivesse lá.

### Efeito esperado
Perguntas sobre preço de lacrado, iPad, Mac, Apple Watch e acessório
devem parar de escalar desnecessariamente — a IA agora encontra esses
preços de verdade, como já encontrava pra seminovo.

---

## [Fase 85] — Correção: "messages must contain the word json" + proteção sistêmica

### Causa raiz
`central-fornecedor-ia.service.ts` (Fase 83) usa `formatoJson: true`
mas o prompt de sistema descrevia o formato como `{"itens": [...]}`
sem nunca escrever literalmente a palavra "json" no texto — a OpenAI
exige isso quando `response_format: json_object` está ligado.

### Corrigido
- `central-fornecedor-ia.service.ts` — prompt reescrito pra mencionar
  "JSON" explicitamente.
- **Proteção sistêmica** em `openai.provider.ts` (o único lugar que liga
  `response_format: json_object`): se nenhuma mensagem mencionar "json",
  adiciona automaticamente `"Responda sempre em formato JSON."` antes de
  chamar a API. Isso cobre não só esse caso, mas qualquer chamada
  futura que esqueça — inclusive prompt configurável pelo admin
  (Configurações → IA), que também poderia cair nesse mesmo erro se
  editado sem essa palavra.

---


## [Fase 84] — Correção de build: categoria "mac" faltando em 4 lugares

### Causa raiz
Adicionar "mac" ao tipo `Produto["categoria"]` (Fase 83) quebra todo
`Record<Produto["categoria"], string>` que lista as categorias sem essa
chave nova — TypeScript exige todas as chaves da união presentes.

### Corrigido
- `produtos-table.tsx` — `CATEGORIA_LABEL` (causa do erro de build)
- `estoque.schema.ts` — enum Zod de validação (sem isso, formulário
  rejeitaria "mac" mesmo que o build passasse)
- `produto-form.tsx` — dropdown de categoria (sem isso, "mac" seria
  aceito mas nunca selecionável na tela)
- `categorias.ts` (loja pública) — não quebrava o build (tem
  fallback), mas Mac apareceria sem rótulo bonito na loja

Confirmado que não sobrou nenhum outro `Record<Produto["categoria"]>`
incompleto no projeto.

---


## [Fase 83] — Central de Cadastro por Fornecedor: uma tela, classificação automática

Antes: seminovo e lacrado tinham telas separadas, cada uma exigindo que
a equipe já soubesse de antemão o que estava colando. Agora é uma
central só — cola a lista inteira do fornecedor (misturada, do jeito
que chega mesmo), a IA classifica cada linha e manda pro destino certo.

### Como classifica
- **Seminovo**: linha tem % de bateria → vira aparelho de verdade
  (mesmo fluxo de antes, precisa de IMEI antes de salvar).
- **Lacrado**: sem % de bateria, geralmente sob cabeçalho "LACRADOS" →
  casa com o catálogo mestre (Fase 66), atualiza quantidade/preço.
- **Outro produto** (iPad, MacBook, Apple Watch, acessório, até marca
  não-Apple como JBL): cria ou atualiza um produto genérico simples.

### Detalhes tratados no prompt
- **Múltiplas unidades na mesma linha**: "16 PRO MAX 256G
  90%⚫️90%🩶92%💛5149" vira 3 itens separados (bateria/cor diferentes),
  todos no mesmo preço mostrado no final da linha — é assim que
  fornecedor lista várias unidades do mesmo modelo de uma vez.
- **Emoji de cor**: mapa completo (⚫️preto, ⚪️branco, 🔵azul, 💜roxo,
  💛amarelo, 💚verde, 🩶titânio/cinza, 🧡laranja) — reconhece sem
  precisar que o fornecedor escreva o nome da cor por extenso.
- Categoria nova: `mac` (não existia — MacBook não tinha pra onde ir).

### Nada aplicado sem revisão
Cada item extraído aparece num card só pra confirmar — nenhum
cadastro/atualização acontece automaticamente. Seminovo ainda exige
IMEI digitado na hora (a IA nunca inventa isso).

### Onde acessar
`/estoque/central-fornecedor` — também substituiu os links de
"iPhones Seminovos"/"iPhones Lacrados" na Central da Loja (`/loja-admin`).

---

## [Fase 82] — Correção de build: TipoRegraLucro importado do lugar errado

### Corrigido
`regras-lucro-panel.tsx` importava `TipoRegraLucro` de dentro do
service (`regras-lucro.service.ts`), mas esse arquivo só usa o tipo
internamente — não o re-exporta. Corrigido pra importar direto de
`@/types`, onde o tipo é de fato exportado. Verificado que não tinha
mais nenhum caso parecido no resto do projeto.

---


## [Fase 81] — Central da Loja completa: as 21 seções

Sidebar única em `/loja-admin`, organizando tudo — nada duplicado, nada
movido do que já funcionava. Itens marcados com "↗" na sidebar apontam
pra telas que já existiam antes (Estoque, Pedidos, Clientes,
Configurações); o resto é novo de verdade.

### Novo — 6 telas administrativas completas
- **Dashboard**: receita do mês, ticket médio, pedidos aguardando
  atenção — tudo somado direto de `pedidos_loja`/vendas reais.
- **Marcas**: cadastro simples, usado pra organizar o catálogo.
- **Coleções**: agrupamentos de produtos (campanhas sazonais, etc).
- **Cupons**: percentual ou valor fixo, pedido mínimo, limite de uso,
  validade — **validado de verdade no checkout**, nunca decorativo.
- **Fretes**: valor e prazo por região — Araguari e Uberlândia já
  vêm com frete grátis em 1 dia útil, como combinado.
- **Avaliações**: aprovação manual antes de publicar na loja.
- **SEO**: título/descrição padrão, agora puxado de verdade pela
  página real da loja (`generateMetadata` dinâmico, antes era fixo no código).

### Cupom no checkout — com cuidado de segurança
- Campo de cupom na tela de checkout, aplica e mostra o desconto.
- **O desconto é sempre recalculado no servidor** — nunca confia num
  valor vindo do navegador (alguém poderia forjar via devtools). A
  Server Action revalida o cupom do zero antes de gerar a cobrança de
  verdade no Mercado Pago.
- Contador de uso do cupom incrementado automaticamente, registro em
  `cupom_usos` vinculado ao pedido.

### Correção durante a implementação
Um arquivo `"use server"` só pode exportar função assíncrona (Server
Action) — ia exportar `calcularDescontoCupom` (função pura, síncrona)
junto das actions de cupom, o que quebraria o build. Separado em dois
arquivos: `cupom.actions.ts` (só Server Actions) e `cupom.utils.ts`
(função pura).

### Menu principal
"Central da Loja" adicionada à sidebar do sistema interno, acesso
direto pra admin/gerente.

---

## [Fase 80] — IA de cadastro de seminovo + regras de lucro + 2 ajustes na loja

Escopo entregue desta vez, do pedido gigante de "Central da Loja":
o núcleo que resolve o objetivo final descrito ("cadastrar aparelho em
menos de 30 segundos"). A reestruturação completa em 21 seções
("LOJA" com Dashboard, Coleções, Cupons, Fretes, SEO, Integrações
etc.) **não está nessa entrega** — ver "Pendente" no fim.

### IA de cadastro de seminovo
- `/estoque/seminovos/cadastro-ia`: cola texto solto (um aparelho ou
  vários juntos) — a IA identifica modelo, memória, cor, bateria, tela
  original, Face ID, True Tone, peças trocadas, observações e preço
  pago. Mesma defesa contra o bug já corrigido antes (JSON sempre
  `{itens: [...]}`, nunca confia em array solto sem checar).
- Cada item extraído aparece pra **revisão editável** antes de
  qualquer coisa ser salva — todo campo pode ser corrigido, IMEI é
  obrigatório (não vem da IA, precisa ser digitado/lido na hora).
- Acha ou cria o produto genérico (marca/modelo) automaticamente, sem
  duplicar se já existir.

### Regras de lucro
- `/estoque/seminovos/regras-lucro`: fixo, percentual, ou por faixa de
  valor. Uma marcada como padrão — a IA de cadastro já aplica sozinha,
  calculando preço de venda e lucro na hora, sem esperar decisão manual
  (dá pra trocar antes de salvar, se quiser).

### 2 ajustes na loja
- **Balão "🏪 Retire agora na loja"** — aparece em todo aparelho
  seminovo disponível (já é fisicamente estoque da loja, por
  definição).
- **Preço rotulado como "no Pix"** — antes o preço aparecia sem dizer
  a qual forma de pagamento correspondia, e ainda tinha um "economize
  X% no Pix" calculado por cima, que não fazia mais sentido depois de
  confirmado que o preço cadastrado já É o valor no Pix. Removido esse
  cálculo duplicado; a tabela de parcelamento real (Fase 79) já mostra
  corretamente quando até o 1x no cartão tem juros, refletindo a
  configuração real da conta.

### Novo — campos em `aparelhos`
`tela_original`, `face_id_ok`, `true_tone_ok`, `video_url`.

---

### Pendente — o resto do pedido de "Central da Loja"
Não construído nesta entrega, por ser um projeto de arquitetura de
informação à parte (reorganizar tudo que já existe espalhado + criar o
que falta):
- Menu lateral unificado "LOJA" com as 21 seções descritas
- Coleções, Marcas, Cupons, Banners (gestão dedicada — Banners já
  existe parcialmente via CMS da Home), Fretes, SEO, Integrações como
  telas próprias
- Catálogo mestre de Android (só o de iPhone lacrado existe, Fase 66-67)
- Financiamento automático completo (a tabela de parcelas real já
  existe, Fase 79 — falta só o cálculo de "financiamento" como produto
  financeiro à parte, se for isso que quis dizer)

---

## [Fase 79] — Tabela de parcelamento real, puxada ao vivo do Mercado Pago

### Corrigido
A loja afirmava "sem juros" sem checar nada de verdade — texto fixo,
inventado. Corrigido: página de produto (seminovo e lacrado) agora
mostra uma tabela real de parcelas, com juros de verdade quando
existir, puxada direto da API do Mercado Pago.

### Adicionado
- `MercadoPagoProvider.buscarTabelaParcelas()` — consulta o endpoint
  de parcelas do Mercado Pago (REST direto, o SDK Node não tem classe
  pronta pra esse endpoint), usando Mastercard como bandeira de
  referência (sem cartão digitado ainda, é a estimativa mais honesta
  possível — o valor exato pro cartão real só aparece no checkout, no
  Brick).
- Cache de 1h (`next: { revalidate: 3600 }`) — taxa de juros não muda
  a cada minuto, evita bater na API do Mercado Pago em toda visita.
- `<TabelaParcelamento>` — sob demanda (só busca quando o cliente
  clica em "Ver opções de parcelamento"), integrado nas páginas de
  produto seminovo e lacrado.
- Card de produto na grade (listagem) continua com um texto simples
  de "em até Nx de R$X" — sem afirmar juros ou não, já que consultar a
  API real por item de uma lista inteira não é viável. A afirmação
  real (com juros de verdade) só existe na página do produto, onde
  cabe uma consulta por vez.

---

## [Fase 78] — Parcelamento explícito até 18x no Brick de cartão

### Esclarecido (não era bug)
Teste com cartão de débito não mostrou parcelamento — comportamento
correto, débito nunca parcela, em nenhum lugar do Brasil.

### Melhorado
`CardPaymentBrick` não fixava limite de parcelas — dependia do padrão
configurado na conta do Mercado Pago, que pode variar. Adicionado
`customization.paymentMethods.maxInstallments: 18`, batendo com o "1x
até 18x" pedido originalmente, independente da configuração da conta.

**Testa de novo com um cartão de crédito** pra confirmar que o
parcelamento aparece — com débito, é esperado só ver à vista.

---


## [Fase 77] — CPF do pagador conectado até o Mercado Pago de verdade

### Corrigido
O checkout já coletava CPF na tela, mas ele nunca era enviado pro
Mercado Pago — ficava só guardado no estado do formulário, sem uso
nenhum. Corrigido em toda a cadeia:
`MercadoPagoProvider` (inclui `payer.identification` quando tem CPF) →
`PaymentService` → `PaymentController` → página de checkout, nos
fluxos de Pix e cartão.

Campo continua opcional (o Mercado Pago aceita pagamento sem CPF), mas
o texto do campo agora deixa claro que informar ajuda a aprovar mais
rápido — é um dado real que o próprio gateway usa pra avaliar risco.

---


## [Fase 76] — Correção: mensagem de erro genérica escondia o motivo real

### Causa raiz
O SDK do Mercado Pago às vezes lança um objeto cru (`{message, status,
cause: [...]}`), não uma instância de `Error` de verdade. Todo `catch`
do módulo de pagamentos checava só `err instanceof Error`, então
qualquer erro nesse formato caía num fallback genérico ("Erro ao
processar cartão", "Erro ao gerar Pix", etc.) — escondendo o motivo
real (token inválido, cartão recusado por que exatamente, etc.).

### Corrigido
- `src/services/pagamentos/erro.utils.ts` (novo) — `extrairMensagemErro()`
  tenta extrair a mensagem real de qualquer formato: `Error` padrão,
  objeto do SDK do Mercado Pago (usa o array `cause` quando existe), ou
  string cru.
- Aplicado nos 6 pontos de catch do módulo (`payment.controller.ts`,
  `gateway-config.actions.ts`) — próxima vez que der erro, a mensagem
  exibida deve mostrar o motivo de verdade, não mais o fallback genérico.

---


## [Fase 75] — Correção: "Amount property is required" no checkout

### Causa raiz
Race condition entre o carrinho carregando do localStorage (async) e o
Card Payment Brick inicializando — se o Brick montasse antes do
carrinho terminar de carregar, `total` ainda era 0, e o Brick nasce
com `amount: 0`, travado nesse valor mesmo depois do carrinho carregar
de verdade (o Brick só inicializa uma vez).

### Corrigido
- `src/app/loja/checkout/page.tsx` — o Card Payment Brick só é
  renderizado quando `total > 0` de verdade (mostra "Carregando valor
  do pedido..." enquanto isso) — evita o Brick nascer com valor zerado.
- `src/services/pagamentos/payment.controller.ts` — validação no
  servidor: se o valor total calculado for zero ou negativo, erro
  claro em português antes de qualquer chamada ao Mercado Pago (nunca
  manda `amount` zerado pra API) — cobre Pix e cartão, os dois passam
  pela mesma função.

---


## [Fase 74] — Correção de build: formatCurrency sem import

### Corrigido
- `src/components/loja/adicionar-ao-carrinho.tsx` — ao trocar o preço
  principal por `PrecoComEconomia` (Fase 69), removi o import de
  `formatCurrency` sem notar que o seletor de variação (unidade
  seminovo) ainda usava a função direto pra mostrar o preço de cada
  opção. Import devolvido. Varredura geral feita em todo o módulo da
  loja pra confirmar que não tinha mais nenhum caso parecido — não tinha.

---


## [Fase 73] — Checkout Transparente Mercado Pago (substitui o Checkout Pro)

Substituição completa do fluxo anterior (redirecionamento pro checkout
hospedado) por Checkout Transparente — o cliente nunca sai da loja.
Arquitetura modular, exatamente como pedido: MercadoPagoProvider,
PaymentService, WebhookService, PaymentRepository, PaymentController,
PaymentHooks — cada camada com uma responsabilidade só, nenhuma lógica
de pagamento dentro de componente React.

### Removido (substituído por esta entrega)
- `src/lib/pagamento/mercadopago.provider.ts` (Checkout Pro)
- `src/services/loja/mercadopago-checkout.actions.ts`
- Webhook antigo em `/api/pagamentos/mercadopago/webhook` — novo
  webhook agora em `/api/mercadopago/webhook`, como pedido.

### Adicionado
- **Tabela `pagamentos`** — histórico detalhado por tentativa
  (status, tipo, parcelas, valor líquido, taxa, QR Code/copia-cola do
  Pix, metadata cru do gateway pra depuração).
- **`configuracoes_gateway_pagamento`** — uma linha por gateway
  (estrutura já aberta pra Stripe/Asaas/PagSeguro no futuro).
- **Configurações → Pagamentos**: Public Key, Access Token (nunca
  exposto pro navegador do cliente), Webhook Secret, modo sandbox/
  produção, ativar/desativar, botão "Testar conexão", status (último
  teste, último webhook, último pagamento aprovado).
- **`/loja/checkout`**: dados do cliente → Pix (QR Code + copia-e-cola
  + cronômetro + status em tempo real via Realtime, nunca recarrega a
  página) ou Cartão (Card Payment Brick **oficial** do Mercado Pago —
  número/CVV/validade nunca chegam no nosso servidor, só o token final).
- **Webhook** (`/api/mercadopago/webhook`) — nunca confia no corpo da
  notificação, sempre confirma o status de verdade direto na API antes
  de mudar qualquer coisa.
- **Automação completa na aprovação**: baixa estoque real (aparelho
  vira "vendido", variante de lacrado desconta quantidade), cria venda
  de verdade (mesma tabela da loja física — aparece em relatórios
  normalmente), lançamento financeiro automático, confirmação por
  WhatsApp (melhor esforço — não derruba o pagamento se falhar).

### Limitação conhecida, documentada
Lançamento financeiro/venda de itens do tipo "lacrado" não tem custo
registrado ainda (`catalogo_lacrados_variantes` não guarda custo por
variante) — o item entra na venda com custo zero, então o lucro desse
item específico fica incompleto no relatório até essa lacuna do
catálogo mestre ser resolvida.

### Não testado ao vivo
Como sempre nesse tipo de integração — especialmente o Card Payment
Brick (tokenização de cartão no navegador) — não pôde ser validado de
ponta a ponta sem um ambiente real do Mercado Pago. Testa com cuidado
extra, de preferência em modo sandbox primeiro.

---

## [Fase 72] — Mercado Pago (Fase 2 combinada) + "Encontre seu iPhone ideal" + 3 itens da lista de conversão

### Mercado Pago — pagamento online de verdade
- Checkout Pro (redireciona pro checkout hospedado do Mercado Pago) —
  nunca lidamos com dado de cartão no nosso servidor, cobre Pix/cartão/
  boleto no mesmo fluxo.
- Botão "Pagar com Pix ou cartão" no carrinho, antes desabilitado,
  agora ativo — cria o pedido, gera a preferência de pagamento, redireciona.
- Webhook (`/api/pagamentos/mercadopago/webhook`) — nunca confia no
  corpo da notificação (poderia ser forjado); sempre busca o status de
  verdade direto na API do Mercado Pago antes de atualizar o pedido.
- Páginas de retorno: `/loja/pedido/sucesso` e `/loja/pedido/erro`.
- **Pendente de você**: definir `MERCADO_PAGO_ACCESS_TOKEN` como
  variável de ambiente na Vercel — nunca colado em chat.

### "Encontre seu iPhone ideal" — a funcionalidade destacada como mais valiosa
- Quiz de 3 perguntas (orçamento, prioridade, novo/seminovo) — cruza
  com o estoque REAL (lacrados com quantidade > 0, seminovos
  disponíveis), pontua por prioridade usando sinal real do nome do
  modelo (Pro Max pontua mais em câmera/desempenho, Plus/Max em
  bateria — não é especificação inventada, é padrão real da própria
  nomenclatura Apple).
- A IA só escreve a frase de explicação sobre os 3 candidatos JÁ
  selecionados por regra — nunca sugere nada fora da lista, nunca
  inventa especificação. Se a IA falhar, ainda mostra os candidatos
  reais, só sem a frase personalizada.
- Link em destaque no cabeçalho da loja (desktop e mobile).

### 3 itens fáceis da lista
- **Produtos vistos recentemente** — localStorage, mesmo padrão de
  carrinho/favoritos/comparador; só aparece se tiver histórico real.
- **Mapa** — endereço + link direto pro Google Maps.
- **Página "Por que comprar na Neotec?"** — comparativo honesto, sem
  exagero.

### Adiado — resto da lista de 25 itens
Histórico de preço, reserva com Pix, simulador de troca por IA,
certificado PDF de seminovo, fidelidade, frete com Correios,
calculadora de parcelas com slider, avaliações com foto, e o resto —
ficam pra próximas entregas.

---

## [Fase 71] — Correção: "b.map is not a function" na importação de tabela do fornecedor

### Causa raiz
`formatoJson: true` liga `response_format: {type: "json_object"}` na
OpenAI — esse modo EXIGE um objeto na raiz do JSON, array solto não é
aceito. O prompt pedia array solto (`[...]`), então a IA era forçada a
embrulhar de algum jeito (provavelmente `{"itens": [...]}`), e o código
só sabia lidar com array puro — chamava `.map()` direto em cima do
resultado do `JSON.parse`, sem checar o formato antes.

### Corrigido — arquivo alterado: `src/services/lacrados/lacrados-ia.service.ts`
- **Prompt**: agora pede explicitamente `{"itens": [...]}` — o único
  formato válido pro modo JSON forçado da OpenAI.
- **Schema Zod novo**: `itemBrutoSchema` (item individual) e
  `respostaIaSchema` (objeto com chave "itens") — valida a resposta da
  IA de verdade, não só confia no `JSON.parse`.
- **`normalizarRespostaIA()`** (nova função): aceita os dois formatos —
  array solto `[...]` OU objeto `{itens: [...]}` — sempre confirma
  `Array.isArray()` antes de qualquer `.map()`. Se nenhum dos dois
  formatos bater, lança erro claro em vez de quebrar com "map is not a
  function".
- Componente React (`atualizar-fornecedor-panel.tsx`) e a Server Action
  não precisaram mudar — já consumiam `result.data.itens`
  corretamente; o problema estava só na fronteira onde o JSON cru da
  IA vira dado estruturado, e é ali que a proteção foi colocada (mais
  robusto que espalhar `Array.isArray()` em cada `.map()` downstream).

---


## [Fase 70] — Correção de migração: "cannot change return type of existing function"

### Corrigido
- `create or replace function` não deixa mudar as colunas de retorno
  de uma função `returns table(...)` já existente — Postgres exige
  `drop function` antes. As Fases 68 e 69 tentaram adicionar coluna de
  retorno em 3 funções já existentes desde a Fase 58
  (`listar_aparelhos_disponiveis_loja`, `listar_produtos_loja`,
  `buscar_produto_loja`) sem fazer esse drop primeiro.
- Migração `fase70` corrige isso pra quem já começou a aplicar as
  migrações e travou no meio — segura rodar em qualquer ordem,
  independente de até onde a Fase 68/69 chegou antes de falhar.
- Arquivos originais (`fase68`, `fase69`) também corrigidos com o
  `drop function if exists` antes de cada `create function` — quem for
  aplicar tudo do zero no futuro não bate nesse mesmo erro.

---

## [Fase 69] — Módulo de Conversão e Engajamento: Fase 1 (dado real)

Primeira de 3 fases combinadas. Regra seguida à risca em tudo: nenhum
número de urgência/prova social é inventado — vendas, estoque e
economia vêm sempre de dado real ou de configuração explícita do
admin. Onde não existe dado suficiente, o elemento simplesmente não
aparece, em vez de mostrar algo fictício.

### Novo módulo — Configurações → Marketing & Conversão
- Config geral: desconto Pix (%), limite de "estoque baixo", toggle do
  contador de vendas.
- Barra superior rotativa: itens com texto/ícone/ordem, arrastar-e-
  soltar pra reordenar (reaproveita o mesmo componente do CMS da Home).
- Selos de confiança (biblioteca fixa: produto original, garantia,
  nota fiscal, loja física, assistência, pagamento seguro) — admin liga
  e desliga quais aparecem na faixa abaixo do botão comprar.

### Na loja pública
- Barra superior rotativa, visível em toda página da loja.
- Faixa de selos de confiança na página de produto.
- **Preço com economia real**: "De/Por/Economize" só aparece quando
  existe preço antigo configurado — nunca desconto inventado. Campo
  novo em produtos, aparelhos e variantes de lacrado.
- **Aviso de desconto Pix**, calculado de verdade a partir do
  percentual configurado.
- **Estoque real**: "Restam X unidades" só quando o estoque bate o
  limite configurado de verdade; senão, só "Disponível" — nunca
  urgência falsa.
- **Contador de vendas real**: soma de `venda_itens` de verdade
  vinculada ao produto (direto ou via aparelho) — nunca número
  aleatório. "Mais vendido" só aparece com 10+ vendas reais.
- **Badges de produto**: automáticos (mais vendido, últimas unidades —
  calculados) + manuais (novidade, promoção, oferta, escolha da
  equipe — admin escolhe por produto).
- **Favoritos**: mesmo padrão de carrinho/comparador (localStorage),
  preparado pra migrar pra conta de cliente quando existir login na loja.

### Adiado — Fases 2 e 3 (combinadas, não construídas ainda)
Avaliações, cupons, lista de espera, banners com agendamento, vídeo
por produto (Fase 2) — e "pessoas vendo agora", dashboard de
conversão, pop-ups, landing pages, IA flutuante (Fase 3, depende de
infraestrutura de analytics que ainda não existe).

---

## [Fase 66-68] — Catálogo Inteligente: Lacrados (catálogo mestre) + Seminovos estendido

Separação total entre as duas operações, como pedido. Lacrados ganhou
estrutura nova (catálogo mestre + variante + estoque por variante).
Seminovos reaproveitou a tabela `aparelhos` já existente — só ganhou
os 2 campos que faltavam.

### Lacrados — catálogo mestre novo
- `catalogo_lacrados_modelos` (29 modelos, iPhone 11 até 17 Pro Max) +
  `catalogo_lacrados_variantes` (cor × armazenamento, cada uma com
  quantidade e preço próprios). Semeado via Fase 67 — todas as
  variantes nascem com quantidade 0 (estrutura existe, nada é
  comprável até a equipe atualizar dado real).
- **Atenção**: cor/armazenamento de cada modelo foi levantado com
  cuidado (17/Air/Pro/Pro Max conferidos via busca; os demais vêm de
  conhecimento consolidado) — vale conferir contra o site da Apple
  antes de divulgar, cobre 6 anos de lançamento.
- Tela `/estoque/lacrados`: gestão manual (accordion por modelo,
  edição inline de quantidade/preço por variante) + **atualização via
  IA** — cola a tabela do fornecedor como chegou no WhatsApp, a IA
  extrai modelo/cor/armazenamento/preço e casa com o catálogo mestre.
  Nada é aplicado sem revisão: mostra o que encontrou correspondência
  (pré-selecionado) e o que não encontrou (aviso, precisa de atenção
  manual) antes de qualquer preço mudar de verdade.
- Loja pública: `/loja/lacrados` (lista modelos com estoque) e
  `/loja/lacrados/[modelo]` (seletor cor→armazenamento em cascata — só
  mostra combinação com estoque real, nunca deixa escolher uma
  variante indisponível). Descrição padrão única pra todo lacrado
  (garantia Apple, nota fiscal, parcelamento, retirada, entrega).

### Seminovos — estendido, não duplicado
- `aparelhos` ganhou `pecas_substituidas` (tela/bateria/carcaça) e
  `observacoes` — aparecem no formulário de cadastro (só quando
  condição é seminovo/usado) e na página de produto da loja, junto da
  saúde da bateria que já existia.

### Carrinho — terceiro tipo de item
- `ItemCarrinho`/`pedido_loja_itens` ganharam suporte a "lacrado" (além
  de produto/aparelho que já existiam) — `lacrado_variante_id` novo,
  mesma lógica de "cada item referencia exatamente um dos três".

---

## [Fase 64-65] — CMS da Home da Loja: blocos reordenáveis, Hero Slider

A home da loja deixa de ser conteúdo fixo em código — vira 100%
administrável em **Configurações → Home da Loja**, sem precisar de
deploy pra mudar banner, reordenar seção, ou programar campanha sazonal.

### Adicionado
- **Hero Slider**: múltiplos slides com imagem separada pra desktop e
  mobile, título, subtítulo, botão+link, prioridade, janela de data
  (ativa a partir de / até). Navegação por seta e bolinha, troca
  automática a cada 6s quando tem mais de um slide.
- **Seções reordenáveis** (`home_secoes`): banner, vitrine de produtos,
  categorias, trade-in, assistência/diferenciais, avaliações, vídeo,
  instagram, texto — arrastar-e-soltar pra reordenar
  (`@dnd-kit`), ativar/desativar, e a mesma janela de data do slider
  (é o mecanismo de "campanha sazonal sem mexer em código": a seção
  aparece e some sozinha pela data configurada).
- **9 componentes de bloco** (`components/loja/blocos/`), um por tipo
  de seção — a home renderiza dinamicamente na ordem configurada.
- **Semente** (Fase 65): o conteúdo que já existia fixo na home (hero,
  diferenciais, categorias, destaques, banner de trade-in) virou dado
  do CMS — nada some da tela depois da migração, só passa a ser
  editável.

### Destaques de produto (pedido explícito)
- Badge "Disponível em loja" na página de produto.
- **Saúde da bateria** (só pra seminovo/usado) com cor — verde ≥85%,
  amarelo 70-84%, vermelho abaixo disso.
- Bloco de garantia, retirada em loja e entrega/frete (informativo —
  não existe cálculo de frete automático, combinação continua via
  WhatsApp).

### Pendências que dependem de você
- **Logo "Neotec Brasil" em preto**: mencionada mas não anexada nessa
  entrega — continua usando o placeholder "N" até o arquivo ser enviado.
- Upload de imagem do Hero Slider usa bucket público (`loja-cms`) — URL
  fixa, sem expiração, adequado pra imagem de marketing (diferente do
  bucket privado usado pra mídia de conversa de cliente).

---

## [Fase 63] — Correção de build: tipo implícito na rota de comparação

### Corrigido
- `/api/loja/comparar` — `produtos.map((p) => ...)` sem tipo, porque o
  Supabase não gera tipo automático pra função SQL customizada
  (`comparar_produtos_loja`). Adicionadas interfaces explícitas
  (`ProdutoComparacaoRow`, `AparelhoBulkRow`) pro retorno das duas
  funções RPC usadas nessa rota.

---

## [Fase 62] — Loja: visual mais premium (identidade própria, sem cópia)

Contexto: foi pedido explicitamente pra copiar o visual da iPlace —
recusado (propriedade intelectual de outra empresa, mantenho esse
limite independente de como o pedido é formulado). Em vez disso,
elevei o visual com um padrão clássico de loja premium (contraste
claro/escuro alternado, tipografia mais confiante), com identidade
própria da Neotec.

### Melhorado
- **Hero**: tipografia bem maior (72px em telas grandes), textura
  sutil de pontos no fundo, animação de entrada suave.
- **Seção escura de contraste**: diferenciais (garantia, parcelamento,
  trade-in, assistência) agora numa seção preta — alternância
  claro/escuro é um padrão clássico de loja de tecnologia premium,
  cria ritmo visual em vez de tudo no mesmo tom.
- **Cards de produto**: imagem com gradiente sutil em vez de cinza
  chapado, zoom suave no hover.
- **Banner de trade-in**: gradiente diagonal em vez de cor sólida,
  cantos mais arredondados.
- Nova animação `reveal-up` (só aditiva no `tailwind.config.ts`, não
  muda nada do resto do app) — usada nas categorias da home.

---

## [Fase 60-61] — Loja Neotec: redesign completo + Trade-in + Busca + Comparador

### Trade-in
- Página `/loja/trade-in`: formulário coleta modelo, armazenamento,
  condição e observações do aparelho do cliente — vira uma solicitação
  (`solicitacoes_trade_in`), sem estimativa automática de valor (decisão
  combinada — equipe avalia e responde por WhatsApp).
- Nova aba "Trade-in" na tela **Pedidos da Loja**, com status e link
  direto pro WhatsApp do cliente.

### Busca inteligente
- Ícone de busca no cabeçalho abre um overlay de tela cheia — resultado
  ao vivo enquanto digita (debounce de 250ms, não busca a cada tecla).

### Comparador de iPhones
- Botão de comparar nos cards de iPhone/Android — barra flutuante
  aparece quando há 2+ selecionados, leva pra `/loja/comparar` (até 3
  aparelhos lado a lado: categoria, marca/modelo, armazenamento
  disponível, condição, preço a partir de).

### Redesign — Apple-inspirado, identidade própria
- **Home**: hero maior, seção de diferenciais (garantia, parcelamento,
  trade-in, assistência), banner de trade-in no rodapé.
- **Cards de produto**: parcelamento calculado ("ou 12x de RX sem
  juros") junto do preço, botão de comparar.
- **Página de produto**: imagem fica fixa ao rolar (`sticky`) em telas
  grandes, seção de garantia/assistência integrada com link direto pra
  `/consultar-os`.
- **Cabeçalho**: busca integrada, link "Troque seu usado" na navegação.

### Segurança — mesma disciplina da entrega anterior
Duas funções SECURITY DEFINER novas (Fase 61) — `comparar_produtos_loja`
e `aparelhos_disponiveis_loja_bulk`. A rota de comparação inicialmente
ia consultar a tabela direto (seria bloqueada por RLS sem sessão,
página pública) — corrigido antes de fechar a entrega, seguindo o
mesmo padrão das outras funções públicas da loja.

### Nota sobre migrações
`fase60` e `fase61` são independentes uma da outra e da Fase 58 — não
foi necessário editar nenhuma migração já entregue antes (evita risco
de você já ter aplicado e a alteração não pegar).

---

## [Fase 59] — Correção de build: tipo do Buffer no download de PDF

### Corrigido
- `NextResponse(pdfBuffer, ...)` — TypeScript não aceita `Buffer` do
  Node diretamente como `BodyInit`, mesmo sendo compatível em runtime
  (Buffer é uma subclasse de Uint8Array). Convertido pra
  `new Uint8Array(pdfBuffer)` — mesmo conteúdo, tipo compatível.

---


## [Fase 58] — Loja Neotec (Fase 1): catálogo, carrinho, checkout via WhatsApp

Substitui o redirecionamento pro neotecbrasil.com — a loja passa a
viver dentro do Neotec OS, em `/loja`. Inspirada na organização/
usabilidade da iPlace (categorias no topo, grade de produto, página de
produto com variação, carrinho), mas com identidade visual própria —
nada copiado (texto, imagem, ícone).

### Adicionado
- **Catálogo público**: reaproveita `produtos`/`aparelhos` já
  existentes — não duplica cadastro. Produto só aparece na loja depois
  de publicado explicitamente (`visivel_loja`), via nova ação
  "Publicar na loja" direto na tabela de produtos do Estoque.
- **Páginas**: home (categorias + destaques), categoria (grade
  filtrada), produto (com seletor de unidade específica em estoque —
  ex: escolher entre os iPhones 13 seminovos disponíveis, sem expor
  IMEI nem dado interno).
- **Carrinho**: client-side (localStorage, sem precisar de login pro
  cliente), quantidade ajustável, persiste entre visitas.
- **Checkout via WhatsApp** (Fase 1, funciona agora): cria um registro
  em `pedidos_loja` e abre o WhatsApp da loja com a mensagem já
  montada (itens, valores, nome do cliente).
- **Pedidos da Loja** (tela nova pra equipe): fila de pedidos
  recebidos, com status (novo/em atendimento/concluído/cancelado) e
  link direto pro WhatsApp do cliente.
- SEO: catálogo renderizado no servidor (Server Components), não
  buscado só no navegador — crawler recebe o HTML já pronto.

### Preparado, não ativo ainda — Fase 2 (Mercado Pago)
- `pedidos_loja.origem_fechamento` já distingue "whatsapp" de
  "pagamento_online", e `pagamento_id_externo` já existe pra guardar a
  referência da transação. Botão "Pagar com Pix ou cartão" já aparece
  na tela (desabilitado, "em breve") — falta só a integração de
  verdade com o Mercado Pago, que depende de você ter a conta criada.

### Segurança — verificado antes de entregar
Toda leitura pública passa por função SECURITY DEFINER (nunca a tabela
direto) — cliente da loja não autenticado nunca visualiza IMEI, custo,
nem dado de outro cliente. Criação de pedido é Server Action isolada
(`loja-pedido.actions.ts`) — Service Role Key nunca é importado em
nenhum arquivo que roda no navegador (conferido na auditoria final).

### Pendências que precisam da sua atenção
- **Número de WhatsApp da loja está com placeholder** (`5534999999999`)
  em `loja-footer.tsx` e `carrinho/page.tsx` — troca pelo número real
  antes de divulgar a loja.
- **Sem fotos de produto ainda** — os cards mostram um ícone genérico
  no lugar da foto. Fica pra uma próxima rodada se quiser conectar com
  o catálogo de fotos (Fase 43) ou um upload dedicado.

---

## [Fase 56-57] — Correção urgente da OS + PDV completo (indicação, cashback, garantia, PDF)

### Corrigido — urgente
- OS não abria: "Could not find the 'diagnostico_inicial' column ...
  in the schema cache". Confirmado que não era cache desatualizado
  (recarregar não resolveu) — a coluna genuinamente não existia no
  banco, apesar de estar numa migração antiga (Fase 18). Migração
  `fase56` reaplica a Fase 18 inteira, de forma seguperativos (`if not
  exists` em tudo).

### PDV — funcionalidades que faltavam
- **Garantia**: já existia conectada no backend (cria registro de
  garantia de verdade), só não tinha campo na tela — corrigido, aparece
  quando o carrinho tem algum aparelho.
- **Indicação**: select de "quem indicou" no carrinho, salvo em
  `vendas.indicador_id`.
- **Cashback de verdade**: antes existia só como rótulo de forma de
  pagamento, sem efeito nenhum no saldo. Agora: mostra o saldo do
  cliente selecionado, permite usar (abate do total, valida contra o
  saldo real antes de finalizar) e conceder (crédito nessa compra) —
  os dois geram movimento de verdade na tabela `cashback`.
- **CPF ao vender aparelho**: cadastro rápido de cliente ganhou campo
  de CPF; aviso aparece quando o carrinho tem aparelho e o cliente
  selecionado não tem CPF cadastrado (relevante pra nota/garantia).

### PDF de nota de venda
- Botão "Baixar PDF" na tela de venda — arquivo de verdade, gerado com
  `@react-pdf/renderer` (roda em Node puro, sem precisar de
  navegador/Puppeteer — mais leve e confiável em ambiente serverless).
  Diferente da impressão em HTML que já existia, esse é um download
  direto, estilo nota fiscal.

### Cuidado tomado — risco de view desatualizada
`vw_vendas_seguro` (mascara `lucro` pra quem não é admin) foi criada
fora das migrações que tenho acesso — não sei se ela expõe os campos
novos (garantia, cashback, indicação). Pra não arriscar quebrar a
mascaração de lucro recriando a view às cegas, o PDF busca esses 3
campos numa consulta separada, direto da tabela `vendas` (não são dado
sensível) — funciona independente do estado da view.

---

## [Fase 55] — PDV reconstruído (mesma lógica, experiência bem melhor)

O backend já suportava cliente, desconto e forma de pagamento
corretamente — o problema era a experiência: dropdown simples pra
navegar entre aparelhos/produtos (difícil de escanear numa loja com
estoque grande), sem busca, sem jeito rápido de cadastrar cliente novo
sem sair do fluxo, título "PDV rápido" passando sensação de atalho
limitado.

### Redesenhado
- **Busca ao vivo** — um campo só filtra aparelho (nome, IMEI, cor) e
  produto ao mesmo tempo, mostrados como cards clicáveis em vez de
  dropdown.
- **Cliente novo sem sair do fluxo** — botão ao lado do seletor de
  cliente abre um mini-formulário (nome + WhatsApp) inline; salva e já
  seleciona automaticamente, sem recarregar página.
- **Carrinho mais claro** — contador +/- pra quantidade de produto (em
  vez de digitar número), resumo com subtotal/desconto/total separados,
  carrinho fica fixo na tela ao rolar (`sticky`) em telas grandes.
- **Forma de pagamento em botões** (Pix, Dinheiro, Crédito, Débito,
  Boleto, Misto) — mais rápido de bater o olho e clicar do que abrir um
  dropdown.
- Título mudou de "PDV rápido" pra "Nova venda" — não é mais tratado
  como atalho, é o fluxo principal de vender.

### Mantido — nenhuma lógica de negócio mudou
Mesma Server Action (`finalizarVendaPDVAction`), mesmo schema de
payload, mesma criação de venda no banco. Só a experiência de montar o
carrinho antes de finalizar mudou.

---

## [Fase 54] — Visual dos documentos impressos, bem mais cuidado

### Redesenhado
Os 5 templates padrão (OS A4/cupom, Orçamento, Venda cupom, Recibo
cupom) — hierarquia mais clara, mais espaço em branco, cor da marca
(#2643D6) usada com intenção (badge do número do documento, destaque no
total do orçamento), seções com fundo sutil separando a informação,
cabeçalho com o "N" da Neotec em vez de só texto.

Mesmos placeholders de antes — nenhum código de renderização mudou, só
o HTML/CSS guardado no banco. `UPDATE` do conteúdo inteiro (não
substituição parcial de texto), mais seguro.

### Corrigido — bug real encontrado ao reescrever
O placeholder `{{itens}}` (Orçamento e Venda) estava com chave dupla
(escapada) desde a Fase 46/47 — deveria ser `{{{itens}}}` (tripla, HTML
cru), já que a lista de itens é um bloco de HTML montado por código,
não texto de formulário. Com chave dupla, a lista apareceria como texto
cru escapado (`&lt;div&gt;...`) em vez de renderizar as linhas de item
normalmente. Corrigido nesta mesma migração.

---

## [Fase 53] — Correção de build: qz-tray sem tipos TypeScript

### Corrigido
- Pacote `qz-tray` não publica tipos TypeScript, e não existe um
  `@types/qz-tray` real — build falhava com "implicitly has an any
  type". Criado `src/types/qz-tray.d.ts` com `declare module
  "qz-tray";` — resolve o build sem mudar nenhum comportamento em
  runtime (o módulo já era tratado como dado dinâmico, isso só formaliza
  isso pro TypeScript).

---

## [Fase 52] — Redesign do Portal do Cliente (consulta pública de OS)

Escopo combinado antes de implementar: só a busca que já existe hoje
(número da OS + telefone, resultado único) — consulta por CPF, página
de detalhe com timeline/fotos/downloads ficam pra uma entrega futura,
por não existirem ainda (achado durante a análise, não é regressão).

### Redesenhado
- Visual completo da página `/consultar-os` e do card de resultado —
  deliberadamente diferente do sistema interno (que é "ferramenta de
  precisão" pra quem trabalha na loja): aqui é cliente comum, no
  celular, querendo resposta em segundos. Muito espaço em branco,
  cantos macios, tipografia grande.
- Status mostrado com emoji + texto simples (📥 Recebido, 🔵 Em
  diagnóstico, 📋 Orçamento em análise, 🟡 Aguardando sua aprovação, 🟢
  Em reparo, 🧪 Em testes finais, ✅ Pronto para retirada, 📦 Entregue)
  — sem jargão técnico.
- Estado de carregamento (skeleton), estado vazio ("Não encontramos
  nenhuma Ordem de Serviço com esses dados" — nunca erro técnico) e
  botão "Nova pesquisa" bem cuidados.

### Adicionado — normalização do número da OS
- `consultar_os_publico` (função no banco) agora aceita `154`, `0154`,
  `OS154`, `os154`, `OS-154` como a mesma busca — extrai só os dígitos
  dos dois lados (o que a pessoa digitou e o número guardado) antes de
  comparar. O cliente nunca precisa saber que o número interno é
  "OS000154".

### Mantido — nenhuma lógica quebrada
Mesma consulta (RPC `consultar_os_publico`), mesma URL
(`/consultar-os`), mesmos campos obrigatórios (número + telefone),
mesma proteção de dados (a função SECURITY DEFINER continua expondo só
status/prazo/valor/observações públicas — nunca diagnóstico ou dado
interno).

---

## [Fase 50-51] — Módulo de Impressão: Fase 4 (Assinatura Digital) — plano completo

Última fase do plano de 4 aprovado pro módulo de impressão. Construída
de verdade (não só arquitetura vazia) — captura funcional, desativada
por padrão.

### Adicionado
- **Captura via canvas com Pointer Events** — mouse, dedo (touch) e
  caneta de tablet funcionam com o mesmo código, sem biblioteca externa
  nem detecção de dispositivo. `<CapturaAssinatura>` abre um modal com
  a área de assinar, "Limpar" e "Confirmar".
- Bucket privado `assinaturas` + tabela `assinaturas_digitais` — cada
  assinatura fica ligada a um documento (tipo + id) e um assinante
  (cliente ou técnico). Permite recapturar (upsert) se alguém errar o
  traço.
- **Toggle em Configurações → Impressão**: "Habilitar assinatura
  digital" — desativado por padrão, como pedido. Só aparece o botão de
  coletar assinatura nas telas quando ativado.
- Botões de "Assinatura do cliente" / "Assinatura do técnico" na tela
  de OS — mostra ✓ quando já coletada.
- **A assinatura aparece automaticamente no documento impresso**: o
  template de OS A4 agora tem os placeholders `{{{assinatura_cliente}}}`
  e `{{{assinatura_tecnico}}}` — se não tiver assinatura coletada,
  continua mostrando a linha em branco pra assinar na mão (like sempre
  foi); se tiver, mostra a imagem da assinatura digital ali.

### Corrigido durante a implementação
- Template de OS já semeado (Fase 47) tinha a linha de assinatura fixa,
  sem placeholder — quem já tivesse rodado a Fase 47 antes de esta
  fase existir não veria a assinatura digital aparecer no documento.
  Migração `fase51` faz `UPDATE` no texto já salvo, trocando pelo texto
  com placeholder — segura mesmo se a Fase 47 ainda nem tinha sido
  aplicada (nesse caso, 0 linhas afetadas, sem erro, porque o
  `fase47.sql` já foi corrigido pra nascer certo).

---

## Plano de impressão profissional — as 4 fases, concluídas
1. ✅ Fundação (templates, QR Code, documentos novos, checklist, histórico)
2. ✅ Configurações → Impressão (cadastro de impressoras, associação por documento)
3. ✅ Impressão direta via QZ Tray (não testado ao vivo pelo assistente — precisa validação com hardware real)
4. ✅ Assinatura digital (funcional, desativada por padrão)

---

## [Fase 49] — Módulo de Impressão: Fase 3 (Impressão direta via QZ Tray)

### Adicionado
- `PrintProvider` (abstração do lado do cliente — impressão roda no
  navegador, diferente do WhatsappProvider que roda no servidor):
  `BrowserPrintProvider` (o que já existia — abre aba, `window.print()`)
  e `QzTrayPrintProvider` (impressão direta de verdade, sem diálogo).
- **Detecção automática**: `usePrintProvider()` verifica se o QZ Tray
  está rodando no computador — sem precisar de toggle manual, já que
  isso é característica de cada máquina, não configuração de loja. Se
  não detectar, cai pro comportamento de sempre (abre aba nova).
- `<BotaoImprimir>` — substitui os botões antigos de impressão (OS,
  Venda, Recibo, Orçamento) por um componente único que tenta impressão
  direta e cai pro navegador automaticamente se não conseguir.
- `<BotaoTestarImpressora>` — o "Testar impressão" agora tenta mandar
  de verdade pra impressora específica via QZ Tray, não só abre uma
  página genérica.
- Rota `/api/impressao/[tipo]/[id]` — devolve o HTML pronto do
  documento (não uma página completa), é o que o QZ Tray consome antes
  de mandar pra impressora.

### Importante — infraestrutura local necessária
QZ Tray precisa estar **instalado e rodando em cada computador** que
for imprimir direto (baixa em qz.io) — isso é fora do alcance de
configurar remotamente, mesma natureza do Bridge do WhatsApp Web. Sem
QZ Tray instalado, tudo continua funcionando exatamente como antes
(abre aba, Ctrl+P) — ninguém perde funcionalidade.

### Limitação conhecida, documentada
Conexão com o QZ Tray está em modo **não assinado** (sem certificado
digital) — o QZ Tray mostra um popup de permissão local na primeira
conexão de cada sessão do navegador. Assinatura por certificado (evita
esse popup) exigiria um servidor de assinatura próprio — não construído
nesta entrega, fica documentado como possível melhoria futura.

### Não testado ao vivo
Diferente do resto do sistema, esta integração específica (QZ Tray) não
pôde ser testada de ponta a ponta pelo assistente — depende de
software local instalado numa máquina real. Vale testar com atenção
extra antes de confiar em produção.

---

## [Fase 48] — Módulo de Impressão: Fase 2 (Configurações → Impressão)

### Adicionado
- Tela **Configurações → Impressão**: cadastro de impressoras (nome,
  tipo A4/cupom/etiqueta, driver, padrão, status ativa/inativa, botão
  "Testar impressão"), associação de impressora por tipo de documento
  (padrão da loja inteira, ou só pra quem está configurando).
- Página `/impressao/teste` — abre o diálogo de impressão do navegador
  automaticamente, pra confirmar visualmente que a impressora física
  está funcionando. Enquanto a impressão direta (Fase 3, QZ Tray) não
  existe, é isso que "testar impressão" faz de verdade.
- Link pro histórico de impressões (Fase 1) direto da tela de
  Configurações → Impressão.

### Corrigido durante a implementação
- `impressora_documento_preferencia` usava `unique (loja_id, usuario_id,
  tipo_documento)` — mas NULL nunca é considerado igual a NULL numa
  unique constraint comum no Postgres, então duas preferências "da loja
  inteira" (usuario_id null) pro mesmo documento não seriam bloqueadas.
  Corrigido com dois índices únicos parciais (um pra usuário específico,
  um só pra usuario_id null) + o código do service faz busca manual
  antes de decidir entre criar ou atualizar, em vez de confiar em
  upsert com ON CONFLICT nessa coluna. Migração `fase48` criada como
  correção defensiva — funciona tanto se a Fase 46 já tinha sido
  aplicada com a constraint antiga quanto se ainda nem existia.

---

## [Fase 46-47] — Módulo de Impressão Profissional: Fase 1 (Fundação)

Plano em 4 fases aprovado antes de implementar (inventário do que já
existia: só OS tinha impressão, sem template, sem QR, sem histórico).
Esta entrega é a Fase 1 — fundação.

### Adicionado
- **Sistema de templates**: HTML com placeholders (`{{cliente}}`, etc.)
  guardado no banco (`documento_templates`), não preso ao React —
  editável sem deploy. Dois tipos de placeholder: `{{chave}}` (escapado,
  pra dado de formulário) e `{{{chave}}}` (HTML cru, só pra blocos
  montados por código nosso como QR e checklist — nunca pra dado de
  usuário, proteção contra XSS mantida).
- **5 templates padrão semeados** (OS A4, OS cupom, Orçamento A4, Venda
  cupom, Recibo cupom) — sistema funciona sem precisar cadastrar nada
  manualmente antes.
- **QR Code** — só em documentos do cliente (`?via=cliente`, padrão),
  nunca na via da loja (`?via=loja`). Aponta pro `/consultar-os`, que já
  existia e é público (Fase 8) — não precisou de portal novo. Página de
  consulta agora aceita `?numero=` na URL, pré-preenchendo o campo
  quando vem de QR escaneado.
- **Documentos novos**: Orçamento (A4), Venda (cupom), Recibo (cupom) —
  antes só existia impressão de OS.
- **Checklist completo na OS impressa**: campos que faltavam
  (microfone, alto-falante, auricular, flash, wifi, bluetooth,
  carregamento, sensor, vibração) adicionados em `checklist_os`.
- **Histórico de impressão**: toda impressão registrada (quem, quando,
  documento) — tela em Configurações → Impressão — Histórico, com
  reimprimir.
- Estrutura de impressoras (`impressoras`,
  `impressora_documento_preferencia`) e assinatura digital
  (`configuracoes_ia.assinatura_digital_habilitada`) já criadas no
  banco, preparadas pras Fases 2 e 4 — sem uso real ainda.

### Arquitetura confirmada
`PrintProvider` como conceito (Browser agora, QZ Tray na Fase 3) segue
a mesma lógica já usada pro WhatsApp — impressão direta de verdade
precisa de um agente rodando localmente em cada computador, o servidor
sozinho não alcança isso (mesma razão do Bridge do WhatsApp Web).

### Próximas fases (não implementadas ainda)
- Fase 2: Configurações → Impressão (cadastro de impressoras de
  verdade, preferência por usuário)
- Fase 3: impressão direta via QZ Tray
- Fase 4: assinatura digital

---

## [Fase 45] — Mensagem da IA ficando "aguardando" (relógio) no cliente

### Diagnóstico
Envio manual pro mesmo contato chegava normal — só a IA ficava travada.
Causa provável: a IA responde nos mesmos milissegundos em que a
mensagem do cliente chega, diferente de um humano (que demora
segundos/minutos digitando). Mandar mensagem "em cima" de acabar de
receber uma pode desestabilizar a sessão de criptografia do WhatsApp
Web — mesma categoria do erro "Bad MAC" já visto antes nessa conversa,
só que dessa vez afetando o envio, não a conexão inteira.

### Corrigido
- Pausa de 2 segundos antes da IA responder, dando tempo da sessão
  "assentar" entre receber e enviar. Não afeta o envio manual (que já é
  naturalmente mais devagar, por depender de alguém digitando).

### Também esclarecido nesta sessão (sem mudança de código)
- O bug de "mensagem some" era o número do vendedor (Configurações → IA
  → "WhatsApp do vendedor pra perguntas") sendo o MESMO número usado
  pra mandar mensagem de teste como cliente — toda mensagem desse
  número estava sendo interceptada como resposta pendente de pergunta,
  não como conversa nova. Comportamento correto do sistema, só
  confusão de teste — resolvido usando números diferentes pra cada
  papel (vendedor vs cliente de teste).

---

## [Fase 42-44] — Indicações, catálogo de fotos, IA pergunta pro vendedor

### Indicações (Fase 42)
- Módulo novo: pessoas de fora que indicam cliente recorrentemente,
  com saldo (crédito/retirada) — mesmo padrão de ledger já usado em
  Investidores. Campo `indicador_id` na Ordem de Serviço, com Select
  "Indicado por" no formulário.

### Catálogo de fotos + envio de imagem (Fase 43)
- Bucket público `catalogo-fotos` (diferente do bucket privado de
  mídia de conversa — são fotos genéricas de produto, sem dado de
  cliente, precisam de URL estável pro Bridge buscar a qualquer hora).
- Tela de gestão (upload + descrição + remoção). Seletor de foto no
  chat (busca por descrição, ex: "13 preto seminovo", clica e envia).
- `WhatsappProvider.enviarMidia` estendido pra aceitar `"imagem"` além
  de `"audio"`, com legenda opcional — Bridge aprendeu a mandar foto
  também, não só áudio.
- IA de Atendimento ganhou o campo `foto_solicitada` na resposta
  estruturada — quando detecta que uma foto ajudaria a conversa, busca
  no catálogo e manda sozinha (silenciosamente não faz nada se não
  achar, não avisa o cliente que "não achou foto").

### IA pergunta pro vendedor (Fase 44)
- Em vez de só pausar quando não sabe responder, a IA manda a pergunta
  direto pro WhatsApp pessoal do vendedor/dono (configurável em
  Configurações → IA) — a resposta dele é usada pra continuar
  atendendo o cliente original automaticamente, sem precisar abrir o
  sistema. Cliente recebe um aviso curto nesse meio tempo ("só um
  momento, vou confirmar").
- Tabela `ia_perguntas_equipe` guarda a fila (pergunta → resposta).
  Resposta do vendedor é reformulada pela IA numa frase natural antes
  de ir pro cliente (nunca menciona "perguntei pra equipe").
- Mensagem do número do vendedor é interceptada **antes** de qualquer
  automação normal (não vira lead novo por engano).
- Campo opcional — deixando vazio, comportamento continua o mesmo de
  antes (só pausa e cria follow-up).

### Corrigido durante a auditoria desta rodada
- `enviarFotoCatalogoAction` estava sendo importado do arquivo errado
  no seletor de foto do chat (import apontava pra
  `catalogo-fotos.actions`, mas a função vive em `whatsapp.actions` —
  faz mais sentido lá, é envio de mensagem). Corrigido antes de gerar
  o zip, não chegou a subir quebrado.
- `numero_vendedor_perguntas` existia no banco e no service, mas não
  estava exposto na tela de Configurações → IA — sem isso não tinha
  como configurar sem mexer direto no banco. Adicionado o campo no
  schema, action e painel.

---

## [Fase 41] — Foto recebida e áudio (gravar e enviar) no WhatsApp Web

### Adicionado
- Migração `fase41_storage_whatsapp_midia.sql`: bucket privado
  `whatsapp-media` no Supabase Storage. Privado de propósito — acesso
  só por link temporário assinado (5 minutos), nunca URL fixa pública.
- **Recebendo mídia**: o Bridge agora baixa a foto/áudio de verdade
  (`downloadMediaMessage` do Baileys), manda em base64 pro Neotec OS,
  que sobe pro Storage e guarda só o **caminho** em
  `whatsapp_mensagens.url_midia` (nunca a URL final, que expira).
- **Rota `/api/whatsapp-midia`**: gera o link temporário sob demanda —
  o `<img>`/`<audio>` do chat aponta pra cá, não direto pro Storage.
- **Gravando e enviando áudio**: botão de microfone no chat usa
  `MediaRecorder` do navegador, grava, sobe pro Storage, e manda via
  nova rota do Bridge (`/enviar-midia`) — chega no WhatsApp como
  mensagem de voz (ícone de áudio, não anexo de arquivo).
- `WhatsappProvider` ganhou `enviarMidia()` na interface — implementado
  de verdade no WhatsApp Web, `MetaCloudProvider` retorna erro claro
  (Meta tem fluxo de upload próprio, não implementado ainda).

### Ficou de fora, com honestidade
- **Enviar imagem/documento**: os botões continuam desabilitados —
  gravar áudio já cobre o pedido mais concreto (voz), imagem/documento
  de saída fica pra uma próxima rodada se precisar.
- **Mídia recebida pela Meta Cloud API**: só WhatsApp Web baixa mídia de
  verdade por enquanto — a Meta usa um fluxo de download em duas etapas
  diferente (webhook manda só um ID, precisa de chamada extra pra
  baixar), não implementado nesta entrega.

---

## [Fase 40] — Painel do cliente com toggle, funil avança sozinho

### Adicionado
- **Painel do cliente na conversa**: agora começa **fechado** por padrão,
  com botão pra abrir/fechar — não ocupa espaço da conversa até alguém
  pedir pra ver.
- **Funil avança automaticamente**: achado real — todo o "CRM
  inteligente" (score, temperatura, objeção) atualizava o card, mas
  nada nunca movia ele de etapa. Card ficava preso na etapa inicial pra
  sempre. Agora, quando a IA detecta engajamento real (qualquer sinal de
  compra, ou temperatura sair de "frio"), o card avança pra próxima
  etapa — só uma vez, saindo da etapa mais inicial do funil. Dali pra
  frente, o resto do funil continua sendo movido manualmente pela
  equipe (decisão deliberada — não quis a automação decidindo o funil
  inteiro sozinha, só destravar o primeiro passo).

### Limitação conhecida, documentada
O avanço automático só roda quando a **IA de Atendimento está
respondendo de verdade** (dentro do fluxo dela) — se "Atendimento
automático" estiver desligado em Configurações → IA, os cards
continuam só avançando manualmente, como sempre foi.

---

## [Fase 39] — Mensagem do celular sincroniza, e IA insiste mais antes de pausar

### Corrigido — mensagem respondida direto pelo celular não aparecia
O Bridge ignorava de propósito toda mensagem marcada `fromMe` (pra não
duplicar o que o próprio Neotec OS manda) — mas o WhatsApp marca do
mesmo jeito uma mensagem mandada pelo sistema e uma respondida direto
no celular vinculado, não dá pra distinguir só pela mensagem. Agora o
Bridge encaminha toda mensagem `fromMe` pra uma rota nova
(`/api/integracoes/whatsapp-web/mensagem-saida`), que decide: se já
existe uma linha com esse `whatsapp_message_id` (mandada pelo próprio
Neotec OS), ignora como eco; se não existir depois de checar 3 vezes
(dá tempo do envio pelo sistema terminar, evita falso positivo por
corrida), é mensagem nova do celular — grava e pausa a IA (mesma regra
de "assumir conversa" que já existia pro envio manual dentro do sistema).

### Alterado — IA não pausa mais sozinha quando o lead fica "quente"
Decisão do dono do produto: a IA agora **continua tentando fechar a
venda** quando o cliente demonstra interesse forte, em vez de escalar
pra humano automaticamente. Só pausa nos dois casos que protegem contra
informação errada: cliente pede atendimento humano explicitamente, ou a
própria IA não tem confiança pra responder. "Quente" virou um aviso pro
time (follow-up informativo, prazo de 1h, sem pausar nada) — a IA só
para de verdade quando alguém aperta o botão manual.
- Prompt de sistema reforçado: quando o lead está quente, a IA agora é
  instruída a perguntar ativamente o que falta pra fechar (forma de
  pagamento, reserva, dúvida final) — não só responder passivamente.

---

## [Fase 38] — Correção importante: mesmo bug da Fase 37, achado em mais 3 lugares

### Corrigido
- **`getActiveProvider()`** (resolver de WhatsApp — Meta ou WhatsApp Web):
  usava client de sessão. Sem sessão (webhook), a RLS não achava a
  configuração, caía no padrão `"meta_cloud"` mesmo com WhatsApp Web
  selecionado — e como a Meta não estava configurada de verdade, todo
  envio da IA falhava com "Authentication Error". Envio manual
  funcionava normal (esse caminho tem sessão), por isso o sintoma
  confundia: "manual funciona, só a IA não manda nada".
- **`enviarMensagemIA()`**: mesma causa, uma camada abaixo — a gravação
  da mensagem em `whatsapp_mensagens` também usava client de sessão,
  falhando por RLS mesmo depois do envio (quando funcionava) já ter
  dado certo.
- **`buscarPrecoParaAtendimento()`** e **`buscarPrioridadeBuscaPreco()`**:
  mesma causa — a busca de preço (Estoque/Cotações) que a IA usa sempre
  voltava vazia sem sessão, fazendo a IA nunca achar preço nenhum.
- Todos os 4 corrigidos pra Service Role Key. As funções de **escrita**
  que ficam no mesmo arquivo (`salvarPrioridadeBuscaPreco`,
  `criarMapeamentoEmojiCor`, etc.) foram deixadas com client de sessão
  DE PROPÓSITO — são protegidas por RLS de cargo (admin/gerente), e
  trocar pra Service Role enfraqueceria essa proteção. Varredura
  completa do caminho do webhook confirmou que não sobrou mais nenhum
  client de sessão em código que roda sem usuário logado.

---

## [Fase 37] — Correção importante: IA de Atendimento falhava silenciosamente (sem sessão de usuário)

### Corrigido
- `buscarConfiguracaoIA()` usava o client de sessão de usuário
  (`createClient()`). Isso funciona normal quando chamado da tela
  Configurações → IA (tem sessão), mas a IA de Atendimento e o
  follow-up de recuperação de venda rodam dentro do processamento do
  **webhook** — servidor conversando com servidor, sem NENHUMA sessão de
  usuário. Sem sessão, a política de RLS não achava a configuração, a
  função retornava `null`, `getActiveAIProvider()` lançava erro **antes**
  de sequer tentar chamar a IA — e como esse erro específico acontece
  antes do laço de tentativas em `executarPromptIA`, não gerava nem
  linha em `ia_logs`. O sintoma: mensagem chegava, a conversa era pausada
  automaticamente (proteção contra erro técnico), mas sem nenhuma
  resposta e sem rastro nos logs — parecia que a IA nunca tinha tentado.
- Corrigido: `buscarConfiguracaoIA()` agora usa Service Role Key —
  funciona igual com ou sem sessão de usuário.
- Central de Cotações não foi afetada por esse bug (a interpretação
  roda numa Server Action disparada por usuário logado, então tinha
  sessão) — só os caminhos disparados por webhook (Atendimento, cron de
  follow-up) estavam quebrados.

---

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
