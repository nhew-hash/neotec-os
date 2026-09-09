# Design System — Neotec OS

Guia de referência dos padrões visuais do sistema. Toda tela nova deve seguir isto, não reinventar.

## Tipografia

| Uso | Classe |
|---|---|
| Título de página (H1) | `<PageHeader title="..." />` — `font-display text-xl font-semibold` |
| Título de card/seção | `<CardTitle>` — `font-display text-sm font-semibold` |
| Corpo | `text-sm text-foreground` (Inter, padrão) |
| Texto auxiliar/legenda | `text-xs text-muted-foreground` |
| Dado técnico (IMEI, código, preço) | `font-mono` (IBM Plex Mono) |

Fontes: **Sora** (display/títulos), **Inter** (corpo), **IBM Plex Mono** (dados técnicos).

## Cores de status — sempre via `StatusBadge`

Nunca escrever `text-success`/`bg-danger` direto num componente novo. Use:

```tsx
import { StatusBadge } from "@/components/ui/status-badge";
<StatusBadge label="Aprovado" tone="success" />
```

Tons disponíveis: `success` (verde), `warning` (âmbar), `danger` (vermelho), `info` (azul primário), `neutral` (cinza).

Cada domínio mapeia seu enum de status pra um tom, num arquivo próprio em `utils/` (ex: `utils/status-os.ts`, `utils/status-venda.ts`) — a lógica de "o que significa" fica no domínio, o visual fica só no `StatusBadge`.

## Botões

`variant`: `default` (ação primária), `success` (aprovar/concluir), `destructive` (excluir/cancelar), `outline` (secundária), `secondary`, `ghost`, `link`.
`size`: `default`, `sm`, `lg`, `icon`.

## Cards

`rounded-card` (16px), `shadow-card` (repouso) / `shadow-card-hover` (interativo, com `hover:-translate-y-0.5`), borda `border-border/70`.

## Modais e painéis

- **Confirmação rápida / formulário curto** → `Dialog` (`components/ui/dialog.tsx`) — centralizado, fecha com overlay ou X.
- **Formulário mais longo, ou lista de opções** → `Sheet` (painel lateral) — já usado no menu mobile e em "Nova oportunidade" do CRM.

## Layout de página padrão

```tsx
<div className="flex flex-col gap-6">
  <PageHeader title="..." description="..." actions={<Button>...</Button>} />
  {/* filtros, se houver */}
  <Card><CardContent className="p-0">
    <MinhaTable ... />
    <Pagination totalItens={n} itensPorPagina={20} />
  </CardContent></Card>
</div>
```

## Paginação

`components/ui/pagination.tsx` — via query string (`?pagina=2`), mesmo padrão da busca de Clientes. Aplicada hoje em Clientes; adotar nas demais listagens conforme o volume justificar.

## Estados de carregamento

Toda rota principal tem `loading.tsx` usando `PageWithTableSkeleton` ou `CardsGridSkeleton` (`components/ui/table-skeleton.tsx`) — o Next.js mostra automaticamente enquanto a página busca dado no servidor.

## O que foi decidido deixar de fora desta rodada (só visual, sem inventar funcionalidade)

- **Notificações reais no header**: exigiria um modelo de dado novo (tabela, regra de "o que gera notificação"). Adicionar só o ícone sem dado por trás pareceu pior do que não ter — fica pra quando a funcionalidade for decidida de verdade.
- **Date picker customizado**: o `<input type="date">` nativo já é acessível e funciona bem em todos os dispositivos; um calendário customizado é desproporcional pra uma etapa só de UI.
- **Busca global unificada**: a busca do cabeçalho (`BuscaRapida`) reaproveita a busca de Clientes que já existe — não foi criada uma infraestrutura de busca cross-módulo nova.
- **Ordenação de coluna em todas as tabelas**: adicionar em todas as ~15 tabelas do sistema é retrabalho grande fora do escopo desta rodada; o padrão (`Pagination`, `StatusBadge`, `PageHeader`) está pronto pra quem for construir isso depois.

## Módulos onde o `PageHeader` ainda não foi aplicado

Dashboard, Estoque, Assistência, CRM, Financeiro, Comunicação, Investidores, Consignação, Configurações continuam com o H1 escrito na mão (já estava com o tamanho certo — `text-xl` — só não usa o componente). Trocar é mecânico, baixo risco, fica como próximo passo natural.
