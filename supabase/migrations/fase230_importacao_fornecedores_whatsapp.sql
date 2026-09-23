-- Fase 230 — Importação automática de listas de fornecedores via
-- WhatsApp (Goat/Realeza). Migration idempotente.
--
-- Nota de design importante (ver docs/importacao-fornecedores/plano.md):
-- não migramos os produtos já existentes pra uma taxonomia nova — isso
-- teria alto raio de impacto na loja pública/filtragem hoje em produção.
-- A taxonomia em árvore criada aqui é usada SÓ pelo pipeline de
-- importação automática; ela grava também em `produtos.categoria`
-- (texto livre, como sempre funcionou) derivando do slug da categoria,
-- então a loja/filtros existentes continuam funcionando sem mudança.

-- ============================================================================
-- 1) Fontes (fornecedor ↔ grupo do WhatsApp ↔ autores permitidos)
-- ============================================================================

create table if not exists import_fontes (
  id uuid primary key default gen_random_uuid(),
  fornecedor text not null, -- 'goat' | 'realeza' (livre de propósito — novo fornecedor não exige migration)
  grupo_id text, -- JID do grupo (ex: 1203xxxx-xxxx@g.us). Null = aceita só encaminhada direto pro bot.
  nome_grupo text, -- só informativo, ajuda reconhecer na tela
  autores_permitidos text[] not null default '{}', -- telefones (formato paraFormatoInternacionalBR); vazio = qualquer um no grupo pode postar
  aceita_encaminhada boolean not null default true,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists idx_import_fontes_grupo_id on import_fontes (grupo_id) where grupo_id is not null;
create index if not exists idx_import_fontes_fornecedor on import_fontes (fornecedor);

drop trigger if exists trg_import_fontes_updated_at on import_fontes;
create trigger trg_import_fontes_updated_at before update on import_fontes for each row execute function set_updated_at();

-- ============================================================================
-- 2) Idempotência de mensagens recebidas (mesmo padrão da Prostec —
--    fase201/204) + reprocessamento quando a MESMA mensagem é editada.
-- ============================================================================

create table if not exists import_mensagens_processadas (
  id uuid primary key default gen_random_uuid(),
  id_externo text not null,
  hash_conteudo text not null, -- sha256(conteudo) — mesmo id_externo com hash diferente = mensagem editada, reprocessa
  fonte_id uuid references import_fontes(id),
  grupo_id text,
  autor text,
  processado_em timestamptz not null default now(),
  unique (id_externo, hash_conteudo)
);
create index if not exists idx_import_mensagens_id_externo on import_mensagens_processadas (id_externo);

-- ============================================================================
-- 3) Taxonomia em árvore (só pro pipeline de importação — ver nota no topo)
-- ============================================================================

create table if not exists import_categorias (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  parent_id uuid references import_categorias(id),
  ordem integer not null default 0,
  ativo boolean not null default true
);

insert into import_categorias (slug, nome, parent_id, ordem) values
  ('smartphones', 'Smartphones', null, 1),
  ('tablets', 'Tablets', null, 2),
  ('computadores', 'Computadores', null, 3),
  ('smartwatches', 'Smartwatches', null, 4),
  ('acessorios', 'Acessórios', null, 5),
  ('audio', 'Áudio', null, 6),
  ('casa_inteligente', 'Casa inteligente', null, 7),
  ('mobilidade_eletrica', 'Mobilidade elétrica', null, 8),
  ('perfumaria', 'Perfumaria', null, 9)
on conflict (slug) do nothing;

-- Subcategorias (parent resolvido pelo slug do pai — funciona idempotente mesmo rodando de novo)
insert into import_categorias (slug, nome, parent_id, ordem)
select v.slug, v.nome, p.id, v.ordem
from (values
  ('smartphones_iphone', 'iPhone', 'smartphones', 1),
  ('smartphones_samsung', 'Samsung Galaxy', 'smartphones', 2),
  ('smartphones_xiaomi', 'Xiaomi (Redmi, Redmi Note, Poco)', 'smartphones', 3),
  ('smartphones_outras_marcas', 'Outras marcas', 'smartphones', 4),
  ('tablets_ipad', 'iPad', 'tablets', 1),
  ('tablets_android', 'Tablets Android', 'tablets', 2),
  ('tablets_infantil', 'Tablets infantis', 'tablets', 3),
  ('computadores_macbook', 'MacBook', 'computadores', 1),
  ('smartwatches_apple_watch', 'Apple Watch', 'smartwatches', 1),
  ('acessorios_apple', 'Apple Pencil / acessórios Apple', 'acessorios', 1),
  ('audio_fones', 'Fones de ouvido', 'audio', 1),
  ('audio_caixas_de_som', 'Caixas de som', 'audio', 2),
  ('audio_microfones', 'Microfones', 'audio', 3),
  ('casa_inteligente_robos_aspiradores', 'Robôs aspiradores', 'casa_inteligente', 1),
  ('mobilidade_triciclos_patinetes', 'Triciclos / patinetes elétricos', 'mobilidade_eletrica', 1),
  ('perfumaria_perfumes_arabes', 'Perfumes árabes', 'perfumaria', 1),
  ('perfumaria_kits', 'Kits de perfume', 'perfumaria', 2)
) as v(slug, nome, parent_slug, ordem)
join import_categorias p on p.slug = v.parent_slug
on conflict (slug) do nothing;

-- ============================================================================
-- 4) Emoji → cor (editável na tela)
-- ============================================================================

create table if not exists import_emoji_cores (
  id uuid primary key default gen_random_uuid(),
  emoji text not null unique, -- caractere(s) Unicode, ex: '⚫️'
  cor_base text not null,
  ordem integer not null default 0
);
insert into import_emoji_cores (emoji, cor_base, ordem) values
  ('⚫️', 'Preto', 1), ('⚪️', 'Branco / Prata', 2), ('🔵', 'Azul', 3), ('💚', 'Verde', 4),
  ('💜', 'Roxo / Lilás', 5), ('🟣', 'Roxo / Lilás', 6), ('🧡', 'Laranja', 7), ('🩶', 'Cinza / Prata / Natural', 8),
  ('💛', 'Amarelo / Dourado', 9), ('🟡', 'Amarelo / Dourado', 10), ('🩷', 'Rosa', 11), ('❤️', 'Vermelho', 12), ('🔴', 'Vermelho', 13)
on conflict (emoji) do nothing;

-- ============================================================================
-- 5) Catálogo de modelos canônicos (nome oficial + cores oficiais por modelo)
-- ============================================================================

create table if not exists import_modelos_catalogo (
  id uuid primary key default gen_random_uuid(),
  modelo_canonico text not null unique,
  categoria_slug text not null references import_categorias(slug),
  marca text,
  aliases text[] not null default '{}', -- variações de escrita que casam com este modelo
  cores_oficiais jsonb not null default '{}', -- { "cor_base": "nome oficial" }, ex: {"Roxo / Lilás": "Lavanda"}
  ativo boolean not null default true
);
create index if not exists idx_import_modelos_categoria on import_modelos_catalogo (categoria_slug);

-- Seed mínimo cobrindo os modelos citados no prompt original (crescer
-- pela tela conforme aparecerem modelos novos não cadastrados).
insert into import_modelos_catalogo (modelo_canonico, categoria_slug, marca, aliases, cores_oficiais) values
  ('iPhone 17', 'smartphones_iphone', 'Apple', '{}', '{"Roxo / Lilás": "Lavanda", "Azul": "Azul-névoa", "Verde": "Sálvia"}'),
  ('iPhone 17 Pro', 'smartphones_iphone', 'Apple', '{}', '{"Branco / Prata": "Prata", "Laranja": "Laranja-cósmico", "Azul": "Azul-intenso"}'),
  ('iPhone 17 Pro Max', 'smartphones_iphone', 'Apple', '{}', '{"Branco / Prata": "Prata", "Laranja": "Laranja-cósmico", "Azul": "Azul-intenso"}'),
  ('iPhone 17e', 'smartphones_iphone', 'Apple', '{"iphone 17-e","iphone 17 e"}', '{}'),
  ('iPhone 18 Pro Max', 'smartphones_iphone', 'Apple', '{}', '{}'),
  ('iPhone 16', 'smartphones_iphone', 'Apple', '{}', '{}'),
  ('iPhone 16 Plus', 'smartphones_iphone', 'Apple', '{"iphone-16 plus"}', '{}'),
  ('iPhone 15', 'smartphones_iphone', 'Apple', '{}', '{}'),
  ('iPhone 15 Pro', 'smartphones_iphone', 'Apple', '{}', '{}'),
  ('iPhone 15 Pro Max', 'smartphones_iphone', 'Apple', '{}', '{}'),
  ('iPhone 14', 'smartphones_iphone', 'Apple', '{}', '{}'),
  ('iPhone 14 Plus', 'smartphones_iphone', 'Apple', '{}', '{}'),
  ('iPhone 14 Pro Max', 'smartphones_iphone', 'Apple', '{}', '{}'),
  ('iPhone 13', 'smartphones_iphone', 'Apple', '{}', '{}'),
  ('iPhone 13 Pro Max', 'smartphones_iphone', 'Apple', '{}', '{}'),
  ('iPhone 11 Pro Max', 'smartphones_iphone', 'Apple', '{}', '{}'),
  ('iPad 11', 'tablets_ipad', 'Apple', '{}', '{}'),
  ('Apple Pencil', 'acessorios_apple', 'Apple', '{}', '{}'),
  ('Apple Watch Series 11', 'smartwatches_apple_watch', 'Apple', '{"apple watch s-11","apple watch s11"}', '{}'),
  ('Apple Watch SE 3', 'smartwatches_apple_watch', 'Apple', '{"apple watch se-3"}', '{}'),
  ('Apple Watch Series 10', 'smartwatches_apple_watch', 'Apple', '{"apple wacht s10","apple watch s10"}', '{}'),
  ('Apple Watch Series 9', 'smartwatches_apple_watch', 'Apple', '{"apple watch s9"}', '{}'),
  ('MacBook Neo', 'computadores_macbook', 'Apple', '{"macbook neo"}', '{}'),
  ('Redmi Note 15 Pro', 'smartphones_xiaomi', 'Xiaomi', '{"note 15 pro","note15 pro"}', '{}'),
  ('Redmi Note 17 Pro', 'smartphones_xiaomi', 'Xiaomi', '{"note 17 pro"}', '{}'),
  ('Redmi Note 17', 'smartphones_xiaomi', 'Xiaomi', '{"note 17"}', '{}'),
  ('Redmi Note 12 Pro', 'smartphones_xiaomi', 'Xiaomi', '{"note 12 pro"}', '{}'),
  ('Redmi Note 11', 'smartphones_xiaomi', 'Xiaomi', '{"note 11"}', '{}'),
  ('Redmi 17', 'smartphones_xiaomi', 'Xiaomi', '{}', '{}'),
  ('Redmi 15C', 'smartphones_xiaomi', 'Xiaomi', '{"redmi 15c","redmi 15 c"}', '{}'),
  ('Redmi A5', 'smartphones_xiaomi', 'Xiaomi', '{}', '{}'),
  ('Redmi A7 Pro', 'smartphones_xiaomi', 'Xiaomi', '{}', '{}'),
  ('Poco X8 Pro Max', 'smartphones_xiaomi', 'Xiaomi', '{"poco x8 promax"}', '{}'),
  ('Poco X8 Pro', 'smartphones_xiaomi', 'Xiaomi', '{}', '{}'),
  ('Poco C71', 'smartphones_xiaomi', 'Xiaomi', '{}', '{}'),
  ('Poco C81', 'smartphones_xiaomi', 'Xiaomi', '{}', '{}'),
  ('Poco C81 Pro', 'smartphones_xiaomi', 'Xiaomi', '{}', '{}'),
  ('Poco C85', 'smartphones_xiaomi', 'Xiaomi', '{}', '{}'),
  ('Poco M8 Pro', 'smartphones_xiaomi', 'Xiaomi', '{}', '{}'),
  ('Poco F6 Pro', 'smartphones_xiaomi', 'Xiaomi', '{}', '{}'),
  ('Xiaomi Pad 2', 'tablets_android', 'Xiaomi', '{"xiaomi pad2","xiaomi pad 2"}', '{}'),
  ('Samsung Galaxy A07', 'smartphones_samsung', 'Samsung', '{"samsung a07"}', '{}'),
  ('Samsung Galaxy Tab A', 'tablets_android', 'Samsung', '{"tab a29","samsung tab a"}', '{}'),
  ('Tecno Spark Go 1', 'smartphones_outras_marcas', 'Tecno', '{"spark go1","spark go 1"}', '{}'),
  ('Itel 200', 'smartphones_outras_marcas', 'Itel', '{"itel200"}', '{}'),
  ('Robô aspirador Xiaomi H50 Pro', 'casa_inteligente_robos_aspiradores', 'Xiaomi', '{"xiaomi h50 pro"}', '{}'),
  ('Redmi AirDots Play 6', 'audio_fones', 'Xiaomi', '{"fone air dots play 6","air dots play 6"}', '{}'),
  ('JBL Tune 510BT', 'audio_fones', 'JBL', '{"jbl 510bt","fone jbl 510bt"}', '{}'),
  ('JBL Go 4', 'audio_caixas_de_som', 'JBL', '{"jbl go4"}', '{}'),
  ('JBL Grip 4', 'audio_caixas_de_som', 'JBL', '{"jbl grip 4"}', '{}'),
  ('JBL Flip 7', 'audio_caixas_de_som', 'JBL', '{"jbl flip 7"}', '{}'),
  ('JBL Charge 6', 'audio_caixas_de_som', 'JBL', '{"jbl charge 6"}', '{}'),
  ('JBL Boombox 4', 'audio_caixas_de_som', 'JBL', '{"jbl boombox 4"}', '{}'),
  ('Hollyland Lark M2 Combo', 'audio_microfones', 'Hollyland', '{"combo hollyland m2 lark","hollyland m2 lark"}', '{}'),
  ('Triciclo Drift 300W', 'mobilidade_triciclos_patinetes', null, '{"triciclo drift 300w"}', '{}')
on conflict (modelo_canonico) do nothing;

-- ============================================================================
-- 6) Termos permitidos (não descartam item como "comentário")
-- ============================================================================

create table if not exists import_termos_permitidos (
  id uuid primary key default gen_random_uuid(),
  termo text not null unique
);
insert into import_termos_permitidos (termo) values
  ('5g'), ('4g'), ('nfc'), ('gps'), ('lançamento'), ('lacrado'), ('semi'), ('seminovo'), ('cellular')
on conflict (termo) do nothing;

-- ============================================================================
-- 7) Margem configurável por categoria (valor fixo e/ou %), com
--    sobrescrita por subcategoria — reaproveita o MESMO padrão de
--    tipo/faixa da fase80 (regras_lucro), mas ligado à nova taxonomia.
-- ============================================================================

create table if not exists import_margem_categoria (
  id uuid primary key default gen_random_uuid(),
  categoria_slug text not null references import_categorias(slug),
  valor_fixo numeric(12,2),
  percentual numeric(6,3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (categoria_slug)
);
drop trigger if exists trg_import_margem_categoria_updated_at on import_margem_categoria;
create trigger trg_import_margem_categoria_updated_at before update on import_margem_categoria for each row execute function set_updated_at();

-- ============================================================================
-- 8) Oferta de lacrado por fornecedor+tipo_lista — NUNCA usa
--    `catalogo_lacrados_variantes` como "1 linha = 1 fornecedor",
--    porque é um catálogo MESTRE compartilhado (dois fornecedores podem
--    oferecer o mesmo modelo/cor/armazenamento). Cada fornecedor+tipo_lista
--    tem sua própria "oferta ativa" aqui; o preço/quantidade
--    de `catalogo_lacrados_variantes` é derivado (menor preço entre
--    ofertas ativas) por `sincronizarVarianteDeOfertas()`, nunca escrito
--    direto pela importação.
-- ============================================================================

create table if not exists import_lacrados_ofertas (
  id uuid primary key default gen_random_uuid(),
  variante_id uuid not null references catalogo_lacrados_variantes(id) on delete cascade,
  fornecedor text not null,
  tipo_lista text not null,
  preco numeric(12,2) not null,
  ativa boolean not null default true,
  atualizado_em timestamptz not null default now(),
  unique (variante_id, fornecedor, tipo_lista)
);
create index if not exists idx_import_lacrados_ofertas_escopo on import_lacrados_ofertas (fornecedor, tipo_lista);
create index if not exists idx_import_lacrados_ofertas_variante on import_lacrados_ofertas (variante_id);

-- ============================================================================
-- 9) Histórico (mensagem bruta, extração, descartados com motivo, diff)
--    + snapshot pra rollback de 1 clique.
-- ============================================================================

create table if not exists import_execucoes (
  id uuid primary key default gen_random_uuid(),
  fonte_id uuid references import_fontes(id),
  fornecedor text not null,
  tipo_lista text not null,
  mensagem_id_externo text,
  mensagem_bruta text not null,
  itens_extraidos jsonb not null default '[]',
  itens_descartados jsonb not null default '[]', -- [{item, motivo}]
  diff jsonb not null default '{}', -- {entraram: [...], sairam: [...], precosMudaram: [...]}
  aplicado boolean not null default false,
  travada_por_seguranca boolean not null default false,
  motivo_trava text,
  snapshot_para_rollback jsonb, -- estado anterior do escopo (fornecedor+tipo_lista) — usado por reverterExecucaoAction
  revertida_em timestamptz,
  resumo_whatsapp text,
  created_at timestamptz not null default now()
);
create index if not exists idx_import_execucoes_escopo on import_execucoes (fornecedor, tipo_lista, created_at desc);

-- ============================================================================
-- 10) [REMOVIDO na Fase 234] Terceira instância do Bridge só pra
--     fornecedores. Decisão revista: em vez de subir uma instância nova
--     (mais um número, mais um QR Code pra escanear), a importação
--     automática reaproveita a MESMA instância/número já conectado no
--     CRM (Bridge da loja) — as comunidades de fornecedor são grupos
--     comuns do WhatsApp (`@g.us`), e o Bridge já lê grupo desde sempre
--     (`PROCESSAR_GRUPOS=true`, ver Fase 234). Não precisa de linha nova
--     em `integracoes_whatsapp` nem de valor novo no enum
--     `whatsapp_provider_tipo` — ambos ficariam sem uso.
--
--     (Nota técnica de por que isso saiu daqui: `alter type ... add
--     value` não pode ser usado na MESMA transação em que é criado —
--     Postgres exige commit antes de usar o valor novo. O SQL Editor do
--     Supabase roda o script colado inteiro numa transação só, então
--     isso sempre ia quebrar ao rodar tudo de uma vez. Como a feature
--     também não é mais necessária, a solução foi remover, não separar
--     em duas transações.)
-- ============================================================================

-- ============================================================================
-- 11) Colunas novas em `aparelhos`/`produtos` — SEM migrar dado
--     histórico (nota no topo do arquivo).
-- ============================================================================

alter table aparelhos add column if not exists categoria_id uuid references import_categorias(id);
alter table aparelhos add column if not exists tipo_lista_fornecedor text; -- escopo de substituição (goat_completa, apple_lacrados, android, ...)
alter table produtos add column if not exists categoria_id uuid references import_categorias(id);

-- `aparelhos.fornecedor` já existe desde antes desta fase — só passa a
-- ser preenchido/USADO como filtro de escopo na substituição a partir de
-- agora (ver aplicacao.service.ts). Índice novo pra esse novo uso:
create index if not exists idx_aparelhos_fornecedor_origem_status on aparelhos (fornecedor, origem_entrada, status) where origem_entrada = 'fornecedor';

-- ============================================================================
-- 12) RLS — mesmo padrão staff (admin/gerente/vendedor) do resto do estoque.
-- ============================================================================

alter table import_fontes enable row level security;
alter table import_mensagens_processadas enable row level security;
alter table import_categorias enable row level security;
alter table import_emoji_cores enable row level security;
alter table import_modelos_catalogo enable row level security;
alter table import_termos_permitidos enable row level security;
alter table import_margem_categoria enable row level security;
alter table import_lacrados_ofertas enable row level security;
alter table import_execucoes enable row level security;

drop policy if exists "import_fontes_staff_all" on import_fontes;
create policy "import_fontes_staff_all" on import_fontes for all using (current_user_cargo() in ('admin', 'gerente'));

drop policy if exists "import_mensagens_processadas_staff_select" on import_mensagens_processadas;
create policy "import_mensagens_processadas_staff_select" on import_mensagens_processadas for select using (current_user_cargo() in ('admin', 'gerente'));

drop policy if exists "import_categorias_staff_all" on import_categorias;
create policy "import_categorias_staff_all" on import_categorias for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor'));

drop policy if exists "import_emoji_cores_staff_all" on import_emoji_cores;
create policy "import_emoji_cores_staff_all" on import_emoji_cores for all using (current_user_cargo() in ('admin', 'gerente'));

drop policy if exists "import_modelos_catalogo_staff_all" on import_modelos_catalogo;
create policy "import_modelos_catalogo_staff_all" on import_modelos_catalogo for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor'));

drop policy if exists "import_termos_permitidos_staff_all" on import_termos_permitidos;
create policy "import_termos_permitidos_staff_all" on import_termos_permitidos for all using (current_user_cargo() in ('admin', 'gerente'));

drop policy if exists "import_margem_categoria_staff_all" on import_margem_categoria;
create policy "import_margem_categoria_staff_all" on import_margem_categoria for all using (current_user_cargo() in ('admin', 'gerente'));

drop policy if exists "import_lacrados_ofertas_staff_all" on import_lacrados_ofertas;
create policy "import_lacrados_ofertas_staff_all" on import_lacrados_ofertas for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor'));

drop policy if exists "import_execucoes_staff_all" on import_execucoes;
create policy "import_execucoes_staff_all" on import_execucoes for all using (current_user_cargo() in ('admin', 'gerente'));

notify pgrst, 'reload schema';
