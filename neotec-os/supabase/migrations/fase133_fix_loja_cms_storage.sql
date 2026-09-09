-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 133 (Supabase / PostgreSQL)
-- O bucket "loja-cms" foi criado na Fase 64 (banner da home, slides),
-- mas NUNCA ganhou política de RLS pra permitir upload — bucket
-- "público" só controla LEITURA, escrita sempre precisa de política
-- própria em storage.objects. Sem isso, todo upload de slide falhava
-- silenciosamente (mesma causa já corrigida antes pro bucket
-- produtos-fotos, na Fase 102 — esse aqui ficou esquecido).
--
-- Ao investigar achei o MESMO padrão em mais 3 buckets, criados sem
-- política nenhuma desde que foram feitos — corrigindo os 4 juntos:
-- loja-cms (Fase 64), whatsapp-media (Fase 41), catalogo-fotos
-- (Fase 43), assinaturas (Fase 50).
-- ============================================================================

create policy "loja_cms_leitura_publica" on storage.objects for select
  using (bucket_id = 'loja-cms');
create policy "loja_cms_staff_upload" on storage.objects for insert
  with check (bucket_id = 'loja-cms' and auth.role() = 'authenticated');
create policy "loja_cms_staff_update" on storage.objects for update
  using (bucket_id = 'loja-cms' and auth.role() = 'authenticated');
create policy "loja_cms_staff_delete" on storage.objects for delete
  using (bucket_id = 'loja-cms' and auth.role() = 'authenticated');

-- Mesma lacuna nos outros 3 buckets criados sem política nenhuma —
-- corrigindo todos juntos, já que achei o padrão se repetindo.

-- whatsapp-media (privado — só equipe autenticada, nunca público)
create policy "whatsapp_media_staff_all" on storage.objects for all
  using (bucket_id = 'whatsapp-media' and auth.role() = 'authenticated')
  with check (bucket_id = 'whatsapp-media' and auth.role() = 'authenticated');

-- catalogo-fotos (público — reuso de foto em conversa de WhatsApp)
create policy "catalogo_fotos_leitura_publica" on storage.objects for select
  using (bucket_id = 'catalogo-fotos');
create policy "catalogo_fotos_staff_upload" on storage.objects for insert
  with check (bucket_id = 'catalogo-fotos' and auth.role() = 'authenticated');
create policy "catalogo_fotos_staff_delete" on storage.objects for delete
  using (bucket_id = 'catalogo-fotos' and auth.role() = 'authenticated');

-- assinaturas (privado — documento sensível, só equipe)
create policy "assinaturas_staff_all" on storage.objects for all
  using (bucket_id = 'assinaturas' and auth.role() = 'authenticated')
  with check (bucket_id = 'assinaturas' and auth.role() = 'authenticated');

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 133
-- ============================================================================
