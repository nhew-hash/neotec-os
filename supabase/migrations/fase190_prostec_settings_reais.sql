-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 190 (Supabase / PostgreSQL)
-- Popula prostec_settings com os valores reais portados do Neotec
-- Prospector original — a Fase 187 só criou a linha com defaults
-- vazios/genéricos. Também corrige registros que ficaram com o status
-- simplificado antigo (5 status, errado) pro sistema real (10 status).
-- ============================================================================

update prostec_settings
set
  score_weights = '{
    "sem_site": 30, "google_profile_ativo": 15, "muitas_avaliacoes": 10,
    "muitas_avaliacoes_threshold": 30, "instagram_ativo": 10, "telefone_whatsapp": 10,
    "operacao_estabelecida": 10, "segmento_alta_necessidade": 10, "presenca_fraca": 5
  }'::jsonb,
  score_quente_min = 80,
  score_morno_min = 60,
  segmentos_alta_necessidade = array[
    'Restaurantes','Clínicas','Dentistas','Advogados','Contadores','Imobiliárias',
    'Academias','Salões de beleza','Barbearias','Hotéis','Pousadas','Empresas de serviços'
  ],
  segmentos_disponiveis = array[
    'Restaurantes','Clínicas','Dentistas','Advogados','Contadores','Imobiliárias','Oficinas',
    'Auto centers','Academias','Salões de beleza','Barbearias','Lojas','Construção','Elétrica',
    'Refrigeração','Empresas de serviços','Hotéis','Pousadas','Escolas','Cursos','Transportadoras',
    'Indústrias','Outros'
  ],
  cidades_sugeridas = array['Araguari - MG','Uberlândia - MG','Patrocínio - MG','Uberaba - MG','Araxá - MG'],
  status_disponiveis = array[
    'novo','contato_realizado','nao_atendeu','retornar_depois','interessado',
    'proposta_enviada','negociacao','venda_fechada','sem_interesse','numero_invalido'
  ],
  updated_at = now()
where id = 'default';

update prostec_leads set status = 'venda_fechada' where status = 'vendido';
update prostec_leads set status = 'novo' where status not in (
  'novo','contato_realizado','nao_atendeu','retornar_depois','interessado',
  'proposta_enviada','negociacao','venda_fechada','sem_interesse','numero_invalido'
);

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 190
-- ============================================================================
