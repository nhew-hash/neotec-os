# Design System — Neotec OS

Guia dos padrões visuais do **sistema interno** (`app/(sistema)`). Toda tela nova segue isto. Atualizado no redesign da auditoria 360° (ver `docs/AUDITORIA_360.md`).

## Escopo: `.neotec-os`

Os tokens do sistema interno ficam sob a classe `.neotec-os` (em `src/app/globals.css`), aplicada:

- no wrapper do layout de `(sistema)`;
- no `<body>` enquanto o sistema está montado (`components/layout/shell-tema.tsx`), para modais, menus e sheets que o Radix renderiza em portal.

**Login, Portal do Cliente e Loja Virtual continuam com os tokens de `:root`** e não mudam. Raio do card, sombras e fundo do app são variáveis CSS com *fallback* no valor antigo.

## Princípios

1. **Hierarquia antes de decoração.** Um título por tela, uma ação primária por bloco.
2. **Cor só com função.** Neutros para estrutura; azul = ação; vermelho/âmbar/verde = status. Nada de gradiente decorativo.
3. **Borda fina em vez de sombra.** Card = `border` + `shadow-card` (quase imperceptível).
4. **Número inventado nunca.** Fonte que falhou mostra "—" / "Indisponível", nunca `0`.
5. **Toda ação tem resultado visível.** Sucesso atualiza a tela; erro aparece em texto (`role="alert"`). Sem `void acao()` sem olhar o retorno.

## Tokens (`.neotec-os`)

| Token | Valor | Uso |
|---|---|---|
| `--app` | `#F5F5F7` | fundo da aplicação (`bg-app`) |
| `--card` / `--background` | branco | superfícies |
| `--foreground` | `#141418` | texto principal |
| `--muted-foreground` | `#67676F` | texto auxiliar (contraste AA sobre branco) |
| `--primary` | `#0071E3` | **único** azul de ação, links, item ativo |
| `--border` | `240 6% 90%` | bordas e divisores |
| `--radius` / `--radius-card` | 10px / 14px | campos e botões / cards |
| `--nav-*` | neutros claros | navegação lateral (`bg-nav`, `text-nav-foreground`…) |

Status (inalterados): `success`, `warning`, `danger` com variantes `-soft` (fundo) e `-text`. Use pelo `StatusBadge` ou pelos tokens `bg-*-soft` + `text-*-text`.

## Tipografia

Inter em tudo (títulos com `font-display`, que no sistema interno aponta para Inter com tracking negativo). Space Grotesk continua só na loja.

| Uso | Classe |
|---|---|
| Título da página | `font-display text-2xl font-semibold` |
| Título de seção | `text-[13px] font-semibold` |
| Corpo | `text-sm` |
| Auxiliar | `text-xs text-muted-foreground` |
| Rótulo de grupo | `text-[11px] font-semibold uppercase tracking-wide text-muted-foreground` |
| Números | `tabular-nums` (valores, contagens, horários) |

## Datas

Sempre pelos helpers de `utils/format.ts`, que usam fuso fixo `America/Sao_Paulo`:
`formatDateTime`, `formatDate` (data civil `YYYY-MM-DD` não muda de dia), `formatDiaRelativo`, `formatHorarioCurto` (listas), `formatHora` (bolhas). Nunca `toLocaleString()` sem `timeZone` — no servidor (UTC) sai 3h adiantado e o Client Component dá erro de hidratação.

## Navegação (`components/layout/nav-items.ts`)

- `navPrincipal`: Início, Comunicação, CRM, Central Comercial, Clientes — sempre visíveis, com mais peso.
- `navSecundaria`: grupos recolhíveis (Vendas e operação, Catálogo e cadastro, Loja virtual, Gestão, Outros módulos, Sistema).
- Item ativo = `hrefAtivo()` (href mais específico). Não testar `startsWith` item a item.
- Barra inferior (celular) = `itensBarraInferior(cargo)`, no máximo 5.
- Busca de comandos: Ctrl+K / ⌘K (`busca-comandos.tsx`).
- Módulo novo: adicionar em `navSecundaria` com os cargos certos (o RLS continua sendo a proteção real).

## Componentes e padrões

- **Botões**: `Button` (`default` = primária, `outline` = secundária, `ghost` = terciária). Uma primária por bloco. `loading`/`loadingText` para ações assíncronas.
- **Chips de filtro**: `rounded-full h-7/h-8`, ativo = `bg-foreground text-background`, com `aria-pressed`/`aria-selected`.
- **Listas de decisão** (Início, Minha rotina): `ul` com `divide-y` dentro de um card; cada linha é um link até os registros.
- **Kpi**: rótulo `text-xs` + número `text-2xl tabular-nums`; sem ícone decorativo.
- **Modais**: `Dialog` para confirmação/formulário curto; `Sheet` (com `SheetTitle`) para formulário longo.
- **Estados**: toda rota principal tem `loading.tsx`; vazio explica o que fazer; erro diz o que não carregou.
- **Celular**: grids com filhos `min-w-0` (texto truncado não estoura a largura); alvos de toque ≥ 36px.

## Acessibilidade

`aria-current="page"` no item ativo, link "Pular para o conteúdo", `aria-label` em botões só com ícone, `role="alert"` em erros, `aria-live` no histórico de mensagens, `prefers-reduced-motion` respeitado no escopo `.neotec-os`.
