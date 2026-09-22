# Fase 230 — Importação automática de listas de fornecedores via WhatsApp

Relatório de entrega desta fatia do trabalho. Cobre: o motor de
extração/classificação/validação (100% pronto e testado contra as 7
listas reais), a migration de banco (já entregue), e o que falta pra
"ligar os fios" até virar automação de ponta a ponta rodando em produção.

---

## 1. O que está pronto (e testado)

### 1.1. Migration (`supabase/migrations/fase230_importacao_fornecedores_whatsapp.sql`)

Já escrita e entregue anteriormente nesta mesma fase de trabalho. Cria:
`import_fontes`, `import_mensagens_processadas`, `import_categorias`
(árvore, semeada), `import_emoji_cores` (semeada), `import_modelos_catalogo`
(semeado, ~45 modelos), `import_termos_permitidos` (semeado),
`import_margem_categoria`, `import_lacrados_ofertas`, `import_execucoes`
(histórico + rollback). Estende `whatsapp_provider_tipo`, relaxa o
`unique(loja_id)` de `integracoes_whatsapp` pra `unique(loja_id, provider)`,
adiciona `aparelhos.categoria_id`/`tipo_lista_fornecedor`,
`produtos.categoria_id`. RLS habilitado em tudo.

**Ainda não rodei essa migration contra um Supabase real** — é SQL puro,
então `tsc`/testes não pegam erro de sintaxe SQL. Recomendo rodar num
ambiente de teste primeiro (`supabase db push` num branch/projeto de
staging, se você tiver, ou revisar manualmente antes de aplicar em
produção).

### 1.2. Motor de extração (`src/services/importacao-fornecedores/`)

Uma biblioteca **pura** (zero I/O, zero banco) com os seguintes módulos,
todos com testes:

| Arquivo | O que faz |
|---|---|
| `normalizacao.ts` | Preço (8 formatos), bateria, armazenamento/RAM, cidade, conectividade |
| `emoji-cores.ts` | Tabela emoji→cor + catálogo de cores oficiais por modelo |
| `texto-lista.ts` | Extração de cor escrita, preço, cidade, bateria de uma linha |
| `modelo-catalogo.ts` | Catálogo de modelos canônicos + regras de família (Redmi/Poco/JBL/etc) |
| `classificador.ts` | `lista`/`ignorar`/`tipo_desconhecido` + `tipo_lista` |
| `parser-goat.ts` | Parser determinístico da Goat (lista única) |
| `parser-realeza-apple.ts` | Parser da Realeza · Apple lacrados (associação emoji↔preço, cor depois do preço, comentário, CPO) |
| `parser-realeza-linha-unica.ts` | Parser da Realeza · Android/tablets e JBL/extras (um item por emoji) |
| `parser-realeza-perfumes.ts` | Parser da Realeza · Perfumes árabes (quantidade+nome+preço, ambiguidade) |
| `validacao.ts` | Segunda camada de validação (rede de segurança) + ambiguidade genérica |
| `aplicacao-diff.ts` | Diff puro por escopo `fornecedor+tipo_lista`, chave de identidade, travas de segurança |
| `resumo.ts` | Monta o texto do resumo de WhatsApp |
| `orquestrador.ts` | Ponto único: classifica → extrai → valida |

**61 testes automatizados**, rodando contra as **7 listas reais** da spec
(com os emojis exatamente como enviados), cobrindo especificamente cada
asserção que você deu:

- Fixture 1 (Goat): descarta os 2 iPhone 17 Pro Max lacrados (regra
  "lacrado só da Realeza"), descarta os 4 seminovos com bateria < 80%,
  cor por texto vencendo emoji (🟡→Laranja/Dourado), UDII→UDI, iPad/Pencil/
  Apple Watches aceitos com condição inferida corretamente.
- Fixtures 2 e 3 (Realeza Apple lacrados, envio + reenvio no mesmo dia):
  toda a tabela de associação emoji↔preço (1 preço, 2 preços, várias
  linhas, cor depois do preço), CPO descartado, comentário descartado, e
  o **diff exato do reenvio**: MacBook Neo e iPhone 17e atualizam preço
  mantendo o id, iPhone 17 Lavanda sai (desativado), iPhone 18 Pro Max
  512GB entra (sem mais comentário).
- Fixture 4 (Android/tablets): garantia "sem garantia" pra lista toda,
  um item por emoji, Note→Redmi Note, 256/16 vs 258/8 (typo sinalizado),
  NFC como campo separado, "lançamento 🚀" aceito.
- Fixture 5 (Perfumes): quantidade/preço, KIT/PCS→Kits de perfume,
  DELILAH BLANC 148×164 ambíguo e descartado.
- Fixture 6 (JBL/extras): Boombox 4 duas cores (não ambíguo), "xiaomi
  extras" como contexto de marca, "449," → 449.00.
- Fixture 7: as 3 mensagens avulsas classificadas como `ignorar`.

`npx tsc --noEmit` limpo, `npx vitest run` com **128/128 testes** do
projeto inteiro passando (61 novos + 67 já existentes da Fase 229).

---

## 2. O que NÃO está pronto ainda (próxima fase)

Dado o tamanho da spec, priorizei entregar o **motor de extração 100%
correto e testado** (a parte mais arriscada de acertar, porque é onde
mora toda a lógica fina de emoji↔preço/ambiguidade/descartes) antes de
integrar com banco/rotas/telas. Falta:

1. **Rotas do Bridge** (`/api/integracoes/whatsapp-fornecedores/mensagem`,
   `.../mensagem-grupo`, `.../status`, `.../qr`) — seguem o mesmo padrão
   das rotas do Prostec (`prostec/whatsapp/mensagem/route.ts`) que já
   analisei, só falta escrever.
2. **Service de aplicação com I/O** (`aplicacao.service.ts`) — usa
   `calcularPlanoAplicacao`/`avaliarTravasDeSeguranca` (já prontos e
   testados) só falta buscar os itens ativos no banco, aplicar o plano
   numa transação e salvar o snapshot de rollback.
3. **Idempotência** (`import_mensagens_processadas`) — a tabela já existe
   na migration, falta o insert+catch-23505 na rota (mesmo padrão do
   Prostec).
4. **Histórico** (`import_execucoes`) — tabela já existe, falta popular.
5. **Envio do resumo de volta pro WhatsApp** — `resumo.ts` já gera o
   texto, falta chamar o Bridge pra enviar.
6. **Telas de configuração** (fontes, termos permitidos, margem por
   categoria, catálogo de modelos, histórico/rollback) — nenhuma tela
   ainda. Como o motor todo é código puro e testado independente de
   UI, isso é "só" CRUD em cima das tabelas já existentes.
7. **Aplicação da margem por categoria** (`preco_venda = preco_fornecedor
   + margem`) — tabela `import_margem_categoria` existe, falta o cálculo
   ser chamado no service de aplicação.
8. **Rodar a migration contra o Supabase real** (ver seção 1.1).

**Importante**: o service de aplicação (item 2) é onde o **Risco 9**
(vários fornecedores de seminovo simultâneos, que você confirmou ser real)
se resolve de fato — a lógica que resolve isso (`calcularPlanoAplicacao`
escopado por `fornecedor+tipo_lista`, nunca tocando no estoque de outro
fornecedor) já está pronta e testada; só falta ligá-la ao banco.

---

## 3. Desvios da spec original (documentados, por transparência)

1. **Parser determinístico também pra Realeza** (a spec sugeria "avaliar
   parser determinístico pra Goat + LLM pra Realeza"). Optei por
   determinístico nos dois porque as fixtures pedem asserções EXATAS
   (preço, cor, contagem de itens) — um LLM não garante 100% de
   reprodutibilidade execução a execução, e um teste automatizado
   "flaky" contra IA generativa não serve como rede de segurança real.
   Fica registrado como ponto pra reavaliar se o formato da Realeza
   mudar muito (o parser determinístico é mais frágil a mudança de
   formato que um LLM seria).
2. **Taxonomia nova como camada aditiva**, não migração dos produtos
   históricos — o comentário no código atual (`produtos.categoria`)
   deixa claro que é assim de propósito ("livre, cresce sozinha, nunca
   mais lista fixa"); migrar tudo teria um raio de impacto grande na
   loja pública sem necessidade imediata pra esta automação funcionar.
3. **Categoria alinhada aos slugs da migration já escrita**
   (`smartphones_iphone`, `smartphones_xiaomi`, etc — sem separar Redmi/
   Redmi Note/Poco em categorias diferentes) — o campo que distingue
   essas linhas é `marca`/`modelo_canonico`, não a categoria, seguindo a
   letra da spec ("categoria, marca, condição e cor são campos
   separados").

---

## 4. Como retomar

Peça a próxima fase começando pelas rotas do Bridge (item 1) e o service
de aplicação (item 2) — são o que efetivamente liga o motor (já pronto)
no banco de dados e faz a automação rodar de ponta a ponta. As telas de
configuração (item 6) podem vir depois, já que dão pra operar via SQL
direto no início se precisar liberar rápido.
