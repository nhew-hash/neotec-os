-- Fase 270 — Neotec OS como app no celular (PWA)
--
-- 1) push_inscricoes: aparelhos (navegador/app instalado) de cada pessoa que
--    aceitaram receber notificação, mesmo com o app fechado (Web Push).
-- 2) capturas_celular: pedido "tirar fotos / ler IMEI pelo celular" feito no
--    computador (OS, troca, aparelho). O celular da mesma pessoa recebe a
--    notificação, abre a câmera e o resultado volta para a tela do computador.
-- 3) bucket privado os-fotos: fotos do aparelho tiradas pelo celular.
--
-- Só acrescenta: nenhuma tabela/coluna existente muda.
-- Reverter:
--   drop table if exists configuracoes_push; drop table if exists capturas_celular; drop table if exists push_inscricoes;
--   delete from storage.objects where bucket_id = 'os-fotos'; delete from storage.buckets where id = 'os-fotos';
--   drop policy if exists "os_fotos_staff_select" on storage.objects;
--   drop policy if exists "os_fotos_staff_insert" on storage.objects;

create table if not exists push_inscricoes (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  preferencias jsonb not null default '{"mensagens": true, "retornos": true, "aprovacoes": true}'::jsonb,
  ativo boolean not null default true,
  falhas integer not null default 0,
  criado_em timestamptz not null default now(),
  ultimo_envio_em timestamptz
);
create index if not exists idx_push_inscricoes_usuario on push_inscricoes(usuario_id) where ativo;
alter table push_inscricoes enable row level security;
drop policy if exists "push_inscricoes_proprias" on push_inscricoes;
create policy "push_inscricoes_proprias" on push_inscricoes for all
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

create table if not exists capturas_celular (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id(),
  usuario_id uuid not null default auth.uid() references usuarios(id) on delete cascade,
  tipo text not null check (tipo in ('fotos', 'imei')),
  contexto_tipo text not null check (contexto_tipo in ('os', 'trade_in', 'aparelho')),
  contexto_id uuid not null,
  rotulo text,
  status text not null default 'pendente' check (status in ('pendente', 'concluida', 'cancelada')),
  fotos text[] not null default '{}',
  imei text,
  criado_em timestamptz not null default now(),
  concluida_em timestamptz,
  expira_em timestamptz not null default now() + interval '2 hours'
);
create index if not exists idx_capturas_contexto on capturas_celular(contexto_tipo, contexto_id);
create index if not exists idx_capturas_usuario_pendente on capturas_celular(usuario_id) where status = 'pendente';
alter table capturas_celular enable row level security;
-- Quem pediu cria/conclui o próprio pedido; a equipe da loja vê as fotos/IMEI do contexto (OS, troca).
drop policy if exists "capturas_proprias" on capturas_celular;
create policy "capturas_proprias" on capturas_celular for all
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
drop policy if exists "capturas_equipe_leitura" on capturas_celular;
create policy "capturas_equipe_leitura" on capturas_celular for select
  using (loja_id = current_user_loja_id() and current_user_cargo() in ('admin', 'gerente', 'vendedor', 'tecnico'));

insert into storage.buckets (id, name, public) values ('os-fotos', 'os-fotos', false)
on conflict (id) do nothing;
drop policy if exists "os_fotos_staff_select" on storage.objects;
create policy "os_fotos_staff_select" on storage.objects for select
  using (bucket_id = 'os-fotos' and current_user_cargo() in ('admin', 'gerente', 'vendedor', 'tecnico'));
drop policy if exists "os_fotos_staff_insert" on storage.objects;
create policy "os_fotos_staff_insert" on storage.objects for insert
  with check (bucket_id = 'os-fotos' and current_user_cargo() in ('admin', 'gerente', 'vendedor', 'tecnico'));

-- 4) configuracoes_push: chaves VAPID do Web Push, uma linha por loja. Só o
--    servidor (service role) lê; nenhuma policy, sem grant para anon/authenticated.
--    A chave privada nunca vai para o navegador. Gerada e inserida fora do git.
--    Reverter: drop table if exists configuracoes_push;
create table if not exists configuracoes_push (
  loja_id uuid primary key default default_loja_id() references lojas(id),
  vapid_public_key text not null,
  vapid_private_key text not null,
  contato text not null default 'mailto:contato@neotecbrasil.com',
  criado_em timestamptz not null default now()
);
alter table configuracoes_push enable row level security;
revoke all on table configuracoes_push from anon, authenticated;

-- 5) Aviso de retorno do CRM no celular: marca o lembrete já avisado (não repete)
--    e trava a verificação para rodar no máximo a cada 5 minutos.
--    Reverter: alter table crm_followups drop column if exists push_enviado_em;
alter table crm_followups add column if not exists push_enviado_em timestamptz;
alter table configuracoes_push add column if not exists retornos_verificados_em timestamptz not null default now();
