-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 67 (Supabase / PostgreSQL)
-- Semeia o catálogo mestre de Lacrados: 29 modelos (iPhone 11 até 17
-- Pro Max), cada um com suas cores e armazenamentos OFICIAIS de
-- lançamento. Toda variante nasce com quantidade = 0 (estrutura existe,
-- nada é comprável até a equipe atualizar quantidade/preço real —
-- 'o catálogo não representa o estoque físico').
--
-- IMPORTANTE: cor/armazenamento de cada modelo foi levantado com o
-- maior cuidado possível, mas cobre 6 anos de lançamentos da Apple —
-- vale conferir contra o site oficial antes de divulgar pro cliente,
-- em especial os modelos mais recentes (17 e Air).
-- ============================================================================

insert into catalogo_lacrados_modelos (loja_id, nome, ordem)
select id, 'iPhone 11', 0 from lojas;

insert into catalogo_lacrados_variantes (modelo_id, cor, armazenamento, quantidade)
select m.id, v.cor, v.armazenamento, 0
from catalogo_lacrados_modelos m
cross join (values
  ('Preto', '64GB'),
  ('Preto', '128GB'),
  ('Preto', '256GB'),
  ('Branco', '64GB'),
  ('Branco', '128GB'),
  ('Branco', '256GB'),
  ('Amarelo', '64GB'),
  ('Amarelo', '128GB'),
  ('Amarelo', '256GB'),
  ('Verde', '64GB'),
  ('Verde', '128GB'),
  ('Verde', '256GB'),
  ('Roxo', '64GB'),
  ('Roxo', '128GB'),
  ('Roxo', '256GB'),
  ('(PRODUCT)RED', '64GB'),
  ('(PRODUCT)RED', '128GB'),
  ('(PRODUCT)RED', '256GB')
) as v(cor, armazenamento)
where m.nome = 'iPhone 11';

insert into catalogo_lacrados_modelos (loja_id, nome, ordem)
select id, 'iPhone 11 Pro', 1 from lojas;

insert into catalogo_lacrados_variantes (modelo_id, cor, armazenamento, quantidade)
select m.id, v.cor, v.armazenamento, 0
from catalogo_lacrados_modelos m
cross join (values
  ('Verde-meia-noite', '64GB'),
  ('Verde-meia-noite', '256GB'),
  ('Verde-meia-noite', '512GB'),
  ('Cinza-espacial', '64GB'),
  ('Cinza-espacial', '256GB'),
  ('Cinza-espacial', '512GB'),
  ('Prateado', '64GB'),
  ('Prateado', '256GB'),
  ('Prateado', '512GB'),
  ('Dourado', '64GB'),
  ('Dourado', '256GB'),
  ('Dourado', '512GB')
) as v(cor, armazenamento)
where m.nome = 'iPhone 11 Pro';

insert into catalogo_lacrados_modelos (loja_id, nome, ordem)
select id, 'iPhone 11 Pro Max', 2 from lojas;

insert into catalogo_lacrados_variantes (modelo_id, cor, armazenamento, quantidade)
select m.id, v.cor, v.armazenamento, 0
from catalogo_lacrados_modelos m
cross join (values
  ('Verde-meia-noite', '64GB'),
  ('Verde-meia-noite', '256GB'),
  ('Verde-meia-noite', '512GB'),
  ('Cinza-espacial', '64GB'),
  ('Cinza-espacial', '256GB'),
  ('Cinza-espacial', '512GB'),
  ('Prateado', '64GB'),
  ('Prateado', '256GB'),
  ('Prateado', '512GB'),
  ('Dourado', '64GB'),
  ('Dourado', '256GB'),
  ('Dourado', '512GB')
) as v(cor, armazenamento)
where m.nome = 'iPhone 11 Pro Max';

insert into catalogo_lacrados_modelos (loja_id, nome, ordem)
select id, 'iPhone SE (2022)', 3 from lojas;

insert into catalogo_lacrados_variantes (modelo_id, cor, armazenamento, quantidade)
select m.id, v.cor, v.armazenamento, 0
from catalogo_lacrados_modelos m
cross join (values
  ('Meia-noite', '64GB'),
  ('Meia-noite', '128GB'),
  ('Meia-noite', '256GB'),
  ('Estelar', '64GB'),
  ('Estelar', '128GB'),
  ('Estelar', '256GB'),
  ('(PRODUCT)RED', '64GB'),
  ('(PRODUCT)RED', '128GB'),
  ('(PRODUCT)RED', '256GB')
) as v(cor, armazenamento)
where m.nome = 'iPhone SE (2022)';

insert into catalogo_lacrados_modelos (loja_id, nome, ordem)
select id, 'iPhone 12', 4 from lojas;

insert into catalogo_lacrados_variantes (modelo_id, cor, armazenamento, quantidade)
select m.id, v.cor, v.armazenamento, 0
from catalogo_lacrados_modelos m
cross join (values
  ('Preto', '64GB'),
  ('Preto', '128GB'),
  ('Preto', '256GB'),
  ('Branco', '64GB'),
  ('Branco', '128GB'),
  ('Branco', '256GB'),
  ('(PRODUCT)RED', '64GB'),
  ('(PRODUCT)RED', '128GB'),
  ('(PRODUCT)RED', '256GB'),
  ('Verde', '64GB'),
  ('Verde', '128GB'),
  ('Verde', '256GB'),
  ('Azul', '64GB'),
  ('Azul', '128GB'),
  ('Azul', '256GB'),
  ('Roxo', '64GB'),
  ('Roxo', '128GB'),
  ('Roxo', '256GB')
) as v(cor, armazenamento)
where m.nome = 'iPhone 12';

insert into catalogo_lacrados_modelos (loja_id, nome, ordem)
select id, 'iPhone 12 Mini', 5 from lojas;

insert into catalogo_lacrados_variantes (modelo_id, cor, armazenamento, quantidade)
select m.id, v.cor, v.armazenamento, 0
from catalogo_lacrados_modelos m
cross join (values
  ('Preto', '64GB'),
  ('Preto', '128GB'),
  ('Preto', '256GB'),
  ('Branco', '64GB'),
  ('Branco', '128GB'),
  ('Branco', '256GB'),
  ('(PRODUCT)RED', '64GB'),
  ('(PRODUCT)RED', '128GB'),
  ('(PRODUCT)RED', '256GB'),
  ('Verde', '64GB'),
  ('Verde', '128GB'),
  ('Verde', '256GB'),
  ('Azul', '64GB'),
  ('Azul', '128GB'),
  ('Azul', '256GB'),
  ('Roxo', '64GB'),
  ('Roxo', '128GB'),
  ('Roxo', '256GB')
) as v(cor, armazenamento)
where m.nome = 'iPhone 12 Mini';

insert into catalogo_lacrados_modelos (loja_id, nome, ordem)
select id, 'iPhone 12 Pro', 6 from lojas;

insert into catalogo_lacrados_variantes (modelo_id, cor, armazenamento, quantidade)
select m.id, v.cor, v.armazenamento, 0
from catalogo_lacrados_modelos m
cross join (values
  ('Grafite', '128GB'),
  ('Grafite', '256GB'),
  ('Grafite', '512GB'),
  ('Prateado', '128GB'),
  ('Prateado', '256GB'),
  ('Prateado', '512GB'),
  ('Dourado', '128GB'),
  ('Dourado', '256GB'),
  ('Dourado', '512GB'),
  ('Azul-pacífico', '128GB'),
  ('Azul-pacífico', '256GB'),
  ('Azul-pacífico', '512GB')
) as v(cor, armazenamento)
where m.nome = 'iPhone 12 Pro';

insert into catalogo_lacrados_modelos (loja_id, nome, ordem)
select id, 'iPhone 12 Pro Max', 7 from lojas;

insert into catalogo_lacrados_variantes (modelo_id, cor, armazenamento, quantidade)
select m.id, v.cor, v.armazenamento, 0
from catalogo_lacrados_modelos m
cross join (values
  ('Grafite', '128GB'),
  ('Grafite', '256GB'),
  ('Grafite', '512GB'),
  ('Prateado', '128GB'),
  ('Prateado', '256GB'),
  ('Prateado', '512GB'),
  ('Dourado', '128GB'),
  ('Dourado', '256GB'),
  ('Dourado', '512GB'),
  ('Azul-pacífico', '128GB'),
  ('Azul-pacífico', '256GB'),
  ('Azul-pacífico', '512GB')
) as v(cor, armazenamento)
where m.nome = 'iPhone 12 Pro Max';

insert into catalogo_lacrados_modelos (loja_id, nome, ordem)
select id, 'iPhone 13', 8 from lojas;

insert into catalogo_lacrados_variantes (modelo_id, cor, armazenamento, quantidade)
select m.id, v.cor, v.armazenamento, 0
from catalogo_lacrados_modelos m
cross join (values
  ('Meia-noite', '128GB'),
  ('Meia-noite', '256GB'),
  ('Meia-noite', '512GB'),
  ('Estelar', '128GB'),
  ('Estelar', '256GB'),
  ('Estelar', '512GB'),
  ('(PRODUCT)RED', '128GB'),
  ('(PRODUCT)RED', '256GB'),
  ('(PRODUCT)RED', '512GB'),
  ('Rosa', '128GB'),
  ('Rosa', '256GB'),
  ('Rosa', '512GB'),
  ('Azul', '128GB'),
  ('Azul', '256GB'),
  ('Azul', '512GB')
) as v(cor, armazenamento)
where m.nome = 'iPhone 13';

insert into catalogo_lacrados_modelos (loja_id, nome, ordem)
select id, 'iPhone 13 Mini', 9 from lojas;

insert into catalogo_lacrados_variantes (modelo_id, cor, armazenamento, quantidade)
select m.id, v.cor, v.armazenamento, 0
from catalogo_lacrados_modelos m
cross join (values
  ('Meia-noite', '128GB'),
  ('Meia-noite', '256GB'),
  ('Meia-noite', '512GB'),
  ('Estelar', '128GB'),
  ('Estelar', '256GB'),
  ('Estelar', '512GB'),
  ('(PRODUCT)RED', '128GB'),
  ('(PRODUCT)RED', '256GB'),
  ('(PRODUCT)RED', '512GB'),
  ('Rosa', '128GB'),
  ('Rosa', '256GB'),
  ('Rosa', '512GB'),
  ('Azul', '128GB'),
  ('Azul', '256GB'),
  ('Azul', '512GB')
) as v(cor, armazenamento)
where m.nome = 'iPhone 13 Mini';

insert into catalogo_lacrados_modelos (loja_id, nome, ordem)
select id, 'iPhone 13 Pro', 10 from lojas;

insert into catalogo_lacrados_variantes (modelo_id, cor, armazenamento, quantidade)
select m.id, v.cor, v.armazenamento, 0
from catalogo_lacrados_modelos m
cross join (values
  ('Grafite', '128GB'),
  ('Grafite', '256GB'),
  ('Grafite', '512GB'),
  ('Grafite', '1TB'),
  ('Prateado', '128GB'),
  ('Prateado', '256GB'),
  ('Prateado', '512GB'),
  ('Prateado', '1TB'),
  ('Dourado', '128GB'),
  ('Dourado', '256GB'),
  ('Dourado', '512GB'),
  ('Dourado', '1TB'),
  ('Azul-sierra', '128GB'),
  ('Azul-sierra', '256GB'),
  ('Azul-sierra', '512GB'),
  ('Azul-sierra', '1TB'),
  ('Verde-alpino', '128GB'),
  ('Verde-alpino', '256GB'),
  ('Verde-alpino', '512GB'),
  ('Verde-alpino', '1TB')
) as v(cor, armazenamento)
where m.nome = 'iPhone 13 Pro';

insert into catalogo_lacrados_modelos (loja_id, nome, ordem)
select id, 'iPhone 13 Pro Max', 11 from lojas;

insert into catalogo_lacrados_variantes (modelo_id, cor, armazenamento, quantidade)
select m.id, v.cor, v.armazenamento, 0
from catalogo_lacrados_modelos m
cross join (values
  ('Grafite', '128GB'),
  ('Grafite', '256GB'),
  ('Grafite', '512GB'),
  ('Grafite', '1TB'),
  ('Prateado', '128GB'),
  ('Prateado', '256GB'),
  ('Prateado', '512GB'),
  ('Prateado', '1TB'),
  ('Dourado', '128GB'),
  ('Dourado', '256GB'),
  ('Dourado', '512GB'),
  ('Dourado', '1TB'),
  ('Azul-sierra', '128GB'),
  ('Azul-sierra', '256GB'),
  ('Azul-sierra', '512GB'),
  ('Azul-sierra', '1TB'),
  ('Verde-alpino', '128GB'),
  ('Verde-alpino', '256GB'),
  ('Verde-alpino', '512GB'),
  ('Verde-alpino', '1TB')
) as v(cor, armazenamento)
where m.nome = 'iPhone 13 Pro Max';

insert into catalogo_lacrados_modelos (loja_id, nome, ordem)
select id, 'iPhone 14', 12 from lojas;

insert into catalogo_lacrados_variantes (modelo_id, cor, armazenamento, quantidade)
select m.id, v.cor, v.armazenamento, 0
from catalogo_lacrados_modelos m
cross join (values
  ('Meia-noite', '128GB'),
  ('Meia-noite', '256GB'),
  ('Meia-noite', '512GB'),
  ('Estelar', '128GB'),
  ('Estelar', '256GB'),
  ('Estelar', '512GB'),
  ('(PRODUCT)RED', '128GB'),
  ('(PRODUCT)RED', '256GB'),
  ('(PRODUCT)RED', '512GB'),
  ('Roxo', '128GB'),
  ('Roxo', '256GB'),
  ('Roxo', '512GB'),
  ('Azul', '128GB'),
  ('Azul', '256GB'),
  ('Azul', '512GB'),
  ('Amarelo', '128GB'),
  ('Amarelo', '256GB'),
  ('Amarelo', '512GB')
) as v(cor, armazenamento)
where m.nome = 'iPhone 14';

insert into catalogo_lacrados_modelos (loja_id, nome, ordem)
select id, 'iPhone 14 Plus', 13 from lojas;

insert into catalogo_lacrados_variantes (modelo_id, cor, armazenamento, quantidade)
select m.id, v.cor, v.armazenamento, 0
from catalogo_lacrados_modelos m
cross join (values
  ('Meia-noite', '128GB'),
  ('Meia-noite', '256GB'),
  ('Meia-noite', '512GB'),
  ('Estelar', '128GB'),
  ('Estelar', '256GB'),
  ('Estelar', '512GB'),
  ('(PRODUCT)RED', '128GB'),
  ('(PRODUCT)RED', '256GB'),
  ('(PRODUCT)RED', '512GB'),
  ('Roxo', '128GB'),
  ('Roxo', '256GB'),
  ('Roxo', '512GB'),
  ('Azul', '128GB'),
  ('Azul', '256GB'),
  ('Azul', '512GB'),
  ('Amarelo', '128GB'),
  ('Amarelo', '256GB'),
  ('Amarelo', '512GB')
) as v(cor, armazenamento)
where m.nome = 'iPhone 14 Plus';

insert into catalogo_lacrados_modelos (loja_id, nome, ordem)
select id, 'iPhone 14 Pro', 14 from lojas;

insert into catalogo_lacrados_variantes (modelo_id, cor, armazenamento, quantidade)
select m.id, v.cor, v.armazenamento, 0
from catalogo_lacrados_modelos m
cross join (values
  ('Roxo-profundo', '128GB'),
  ('Roxo-profundo', '256GB'),
  ('Roxo-profundo', '512GB'),
  ('Roxo-profundo', '1TB'),
  ('Prateado', '128GB'),
  ('Prateado', '256GB'),
  ('Prateado', '512GB'),
  ('Prateado', '1TB'),
  ('Dourado', '128GB'),
  ('Dourado', '256GB'),
  ('Dourado', '512GB'),
  ('Dourado', '1TB'),
  ('Preto-espacial', '128GB'),
  ('Preto-espacial', '256GB'),
  ('Preto-espacial', '512GB'),
  ('Preto-espacial', '1TB')
) as v(cor, armazenamento)
where m.nome = 'iPhone 14 Pro';

insert into catalogo_lacrados_modelos (loja_id, nome, ordem)
select id, 'iPhone 14 Pro Max', 15 from lojas;

insert into catalogo_lacrados_variantes (modelo_id, cor, armazenamento, quantidade)
select m.id, v.cor, v.armazenamento, 0
from catalogo_lacrados_modelos m
cross join (values
  ('Roxo-profundo', '128GB'),
  ('Roxo-profundo', '256GB'),
  ('Roxo-profundo', '512GB'),
  ('Roxo-profundo', '1TB'),
  ('Prateado', '128GB'),
  ('Prateado', '256GB'),
  ('Prateado', '512GB'),
  ('Prateado', '1TB'),
  ('Dourado', '128GB'),
  ('Dourado', '256GB'),
  ('Dourado', '512GB'),
  ('Dourado', '1TB'),
  ('Preto-espacial', '128GB'),
  ('Preto-espacial', '256GB'),
  ('Preto-espacial', '512GB'),
  ('Preto-espacial', '1TB')
) as v(cor, armazenamento)
where m.nome = 'iPhone 14 Pro Max';

insert into catalogo_lacrados_modelos (loja_id, nome, ordem)
select id, 'iPhone 15', 16 from lojas;

insert into catalogo_lacrados_variantes (modelo_id, cor, armazenamento, quantidade)
select m.id, v.cor, v.armazenamento, 0
from catalogo_lacrados_modelos m
cross join (values
  ('Preto', '128GB'),
  ('Preto', '256GB'),
  ('Preto', '512GB'),
  ('Azul', '128GB'),
  ('Azul', '256GB'),
  ('Azul', '512GB'),
  ('Verde', '128GB'),
  ('Verde', '256GB'),
  ('Verde', '512GB'),
  ('Amarelo', '128GB'),
  ('Amarelo', '256GB'),
  ('Amarelo', '512GB'),
  ('Rosa', '128GB'),
  ('Rosa', '256GB'),
  ('Rosa', '512GB')
) as v(cor, armazenamento)
where m.nome = 'iPhone 15';

insert into catalogo_lacrados_modelos (loja_id, nome, ordem)
select id, 'iPhone 15 Plus', 17 from lojas;

insert into catalogo_lacrados_variantes (modelo_id, cor, armazenamento, quantidade)
select m.id, v.cor, v.armazenamento, 0
from catalogo_lacrados_modelos m
cross join (values
  ('Preto', '128GB'),
  ('Preto', '256GB'),
  ('Preto', '512GB'),
  ('Azul', '128GB'),
  ('Azul', '256GB'),
  ('Azul', '512GB'),
  ('Verde', '128GB'),
  ('Verde', '256GB'),
  ('Verde', '512GB'),
  ('Amarelo', '128GB'),
  ('Amarelo', '256GB'),
  ('Amarelo', '512GB'),
  ('Rosa', '128GB'),
  ('Rosa', '256GB'),
  ('Rosa', '512GB')
) as v(cor, armazenamento)
where m.nome = 'iPhone 15 Plus';

insert into catalogo_lacrados_modelos (loja_id, nome, ordem)
select id, 'iPhone 15 Pro', 18 from lojas;

insert into catalogo_lacrados_variantes (modelo_id, cor, armazenamento, quantidade)
select m.id, v.cor, v.armazenamento, 0
from catalogo_lacrados_modelos m
cross join (values
  ('Titânio-natural', '128GB'),
  ('Titânio-natural', '256GB'),
  ('Titânio-natural', '512GB'),
  ('Titânio-natural', '1TB'),
  ('Titânio-azul', '128GB'),
  ('Titânio-azul', '256GB'),
  ('Titânio-azul', '512GB'),
  ('Titânio-azul', '1TB'),
  ('Titânio-branco', '128GB'),
  ('Titânio-branco', '256GB'),
  ('Titânio-branco', '512GB'),
  ('Titânio-branco', '1TB'),
  ('Titânio-preto', '128GB'),
  ('Titânio-preto', '256GB'),
  ('Titânio-preto', '512GB'),
  ('Titânio-preto', '1TB')
) as v(cor, armazenamento)
where m.nome = 'iPhone 15 Pro';

insert into catalogo_lacrados_modelos (loja_id, nome, ordem)
select id, 'iPhone 15 Pro Max', 19 from lojas;

insert into catalogo_lacrados_variantes (modelo_id, cor, armazenamento, quantidade)
select m.id, v.cor, v.armazenamento, 0
from catalogo_lacrados_modelos m
cross join (values
  ('Titânio-natural', '256GB'),
  ('Titânio-natural', '512GB'),
  ('Titânio-natural', '1TB'),
  ('Titânio-azul', '256GB'),
  ('Titânio-azul', '512GB'),
  ('Titânio-azul', '1TB'),
  ('Titânio-branco', '256GB'),
  ('Titânio-branco', '512GB'),
  ('Titânio-branco', '1TB'),
  ('Titânio-preto', '256GB'),
  ('Titânio-preto', '512GB'),
  ('Titânio-preto', '1TB')
) as v(cor, armazenamento)
where m.nome = 'iPhone 15 Pro Max';

insert into catalogo_lacrados_modelos (loja_id, nome, ordem)
select id, 'iPhone 16', 20 from lojas;

insert into catalogo_lacrados_variantes (modelo_id, cor, armazenamento, quantidade)
select m.id, v.cor, v.armazenamento, 0
from catalogo_lacrados_modelos m
cross join (values
  ('Preto', '128GB'),
  ('Preto', '256GB'),
  ('Preto', '512GB'),
  ('Branco', '128GB'),
  ('Branco', '256GB'),
  ('Branco', '512GB'),
  ('Rosa', '128GB'),
  ('Rosa', '256GB'),
  ('Rosa', '512GB'),
  ('Azul-petróleo', '128GB'),
  ('Azul-petróleo', '256GB'),
  ('Azul-petróleo', '512GB'),
  ('Ultramarine', '128GB'),
  ('Ultramarine', '256GB'),
  ('Ultramarine', '512GB')
) as v(cor, armazenamento)
where m.nome = 'iPhone 16';

insert into catalogo_lacrados_modelos (loja_id, nome, ordem)
select id, 'iPhone 16 Plus', 21 from lojas;

insert into catalogo_lacrados_variantes (modelo_id, cor, armazenamento, quantidade)
select m.id, v.cor, v.armazenamento, 0
from catalogo_lacrados_modelos m
cross join (values
  ('Preto', '128GB'),
  ('Preto', '256GB'),
  ('Preto', '512GB'),
  ('Branco', '128GB'),
  ('Branco', '256GB'),
  ('Branco', '512GB'),
  ('Rosa', '128GB'),
  ('Rosa', '256GB'),
  ('Rosa', '512GB'),
  ('Azul-petróleo', '128GB'),
  ('Azul-petróleo', '256GB'),
  ('Azul-petróleo', '512GB'),
  ('Ultramarine', '128GB'),
  ('Ultramarine', '256GB'),
  ('Ultramarine', '512GB')
) as v(cor, armazenamento)
where m.nome = 'iPhone 16 Plus';

insert into catalogo_lacrados_modelos (loja_id, nome, ordem)
select id, 'iPhone 16 Pro', 22 from lojas;

insert into catalogo_lacrados_variantes (modelo_id, cor, armazenamento, quantidade)
select m.id, v.cor, v.armazenamento, 0
from catalogo_lacrados_modelos m
cross join (values
  ('Titânio-deserto', '128GB'),
  ('Titânio-deserto', '256GB'),
  ('Titânio-deserto', '512GB'),
  ('Titânio-deserto', '1TB'),
  ('Titânio-natural', '128GB'),
  ('Titânio-natural', '256GB'),
  ('Titânio-natural', '512GB'),
  ('Titânio-natural', '1TB'),
  ('Titânio-branco', '128GB'),
  ('Titânio-branco', '256GB'),
  ('Titânio-branco', '512GB'),
  ('Titânio-branco', '1TB'),
  ('Titânio-preto', '128GB'),
  ('Titânio-preto', '256GB'),
  ('Titânio-preto', '512GB'),
  ('Titânio-preto', '1TB')
) as v(cor, armazenamento)
where m.nome = 'iPhone 16 Pro';

insert into catalogo_lacrados_modelos (loja_id, nome, ordem)
select id, 'iPhone 16 Pro Max', 23 from lojas;

insert into catalogo_lacrados_variantes (modelo_id, cor, armazenamento, quantidade)
select m.id, v.cor, v.armazenamento, 0
from catalogo_lacrados_modelos m
cross join (values
  ('Titânio-deserto', '256GB'),
  ('Titânio-deserto', '512GB'),
  ('Titânio-deserto', '1TB'),
  ('Titânio-natural', '256GB'),
  ('Titânio-natural', '512GB'),
  ('Titânio-natural', '1TB'),
  ('Titânio-branco', '256GB'),
  ('Titânio-branco', '512GB'),
  ('Titânio-branco', '1TB'),
  ('Titânio-preto', '256GB'),
  ('Titânio-preto', '512GB'),
  ('Titânio-preto', '1TB')
) as v(cor, armazenamento)
where m.nome = 'iPhone 16 Pro Max';

insert into catalogo_lacrados_modelos (loja_id, nome, ordem)
select id, 'iPhone 16e', 24 from lojas;

insert into catalogo_lacrados_variantes (modelo_id, cor, armazenamento, quantidade)
select m.id, v.cor, v.armazenamento, 0
from catalogo_lacrados_modelos m
cross join (values
  ('Branco', '128GB'),
  ('Branco', '256GB'),
  ('Branco', '512GB'),
  ('Preto', '128GB'),
  ('Preto', '256GB'),
  ('Preto', '512GB')
) as v(cor, armazenamento)
where m.nome = 'iPhone 16e';

insert into catalogo_lacrados_modelos (loja_id, nome, ordem)
select id, 'iPhone 17', 25 from lojas;

insert into catalogo_lacrados_variantes (modelo_id, cor, armazenamento, quantidade)
select m.id, v.cor, v.armazenamento, 0
from catalogo_lacrados_modelos m
cross join (values
  ('Preto', '256GB'),
  ('Preto', '512GB'),
  ('Branco', '256GB'),
  ('Branco', '512GB'),
  ('Verde-sálvia', '256GB'),
  ('Verde-sálvia', '512GB'),
  ('Lavanda', '256GB'),
  ('Lavanda', '512GB'),
  ('Azul-névoa', '256GB'),
  ('Azul-névoa', '512GB')
) as v(cor, armazenamento)
where m.nome = 'iPhone 17';

insert into catalogo_lacrados_modelos (loja_id, nome, ordem)
select id, 'iPhone Air', 26 from lojas;

insert into catalogo_lacrados_variantes (modelo_id, cor, armazenamento, quantidade)
select m.id, v.cor, v.armazenamento, 0
from catalogo_lacrados_modelos m
cross join (values
  ('Preto-espacial', '256GB'),
  ('Preto-espacial', '512GB'),
  ('Preto-espacial', '1TB'),
  ('Branco-nuvem', '256GB'),
  ('Branco-nuvem', '512GB'),
  ('Branco-nuvem', '1TB'),
  ('Dourado-claro', '256GB'),
  ('Dourado-claro', '512GB'),
  ('Dourado-claro', '1TB'),
  ('Azul-céu', '256GB'),
  ('Azul-céu', '512GB'),
  ('Azul-céu', '1TB')
) as v(cor, armazenamento)
where m.nome = 'iPhone Air';

insert into catalogo_lacrados_modelos (loja_id, nome, ordem)
select id, 'iPhone 17 Pro', 27 from lojas;

insert into catalogo_lacrados_variantes (modelo_id, cor, armazenamento, quantidade)
select m.id, v.cor, v.armazenamento, 0
from catalogo_lacrados_modelos m
cross join (values
  ('Prateado', '256GB'),
  ('Prateado', '512GB'),
  ('Prateado', '1TB'),
  ('Azul-intenso', '256GB'),
  ('Azul-intenso', '512GB'),
  ('Azul-intenso', '1TB'),
  ('Laranja-cósmico', '256GB'),
  ('Laranja-cósmico', '512GB'),
  ('Laranja-cósmico', '1TB')
) as v(cor, armazenamento)
where m.nome = 'iPhone 17 Pro';

insert into catalogo_lacrados_modelos (loja_id, nome, ordem)
select id, 'iPhone 17 Pro Max', 28 from lojas;

insert into catalogo_lacrados_variantes (modelo_id, cor, armazenamento, quantidade)
select m.id, v.cor, v.armazenamento, 0
from catalogo_lacrados_modelos m
cross join (values
  ('Prateado', '256GB'),
  ('Prateado', '512GB'),
  ('Prateado', '1TB'),
  ('Prateado', '2TB'),
  ('Azul-intenso', '256GB'),
  ('Azul-intenso', '512GB'),
  ('Azul-intenso', '1TB'),
  ('Azul-intenso', '2TB'),
  ('Laranja-cósmico', '256GB'),
  ('Laranja-cósmico', '512GB'),
  ('Laranja-cósmico', '1TB'),
  ('Laranja-cósmico', '2TB')
) as v(cor, armazenamento)
where m.nome = 'iPhone 17 Pro Max';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 67
-- ============================================================================
