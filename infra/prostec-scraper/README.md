# Prostec Scraper — deploy no Railway

Substitui a Google Places API por um scraper próprio do Google Maps
(`gosom/google-maps-scraper`, grátis, sem limite de 60 resultados por
busca). Roda como **dois serviços separados** no mesmo projeto Railway
do `whatsapp-bridge`/Neotec OS.

## Por que dois serviços

- **`prostec-scraper`** — o scraper de verdade. **Não tem autenticação
  nenhuma** (nem login, nem API key) — se fosse exposto direto na
  internet, qualquer pessoa poderia rodar buscas usando o seu Railway.
  Por isso ele **nunca** recebe domínio público.
- **`prostec-scraper-gateway`** — um Caddy simples na frente, que exige
  o header `X-Api-Key` em toda requisição e só libera as rotas de job
  (`/api/v1/jobs*`). É o único dos dois com domínio público.

```
Neotec OS (Vercel)  →  https://<gateway>.up.railway.app  (Caddy, exige X-Api-Key)
                              │  reverse_proxy (rede privada do Railway)
                              ▼
                     prostec-scraper.railway.internal:8080  (sem auth, sem domínio público)
```

## Passo a passo no Railway

1. **No projeto Railway que já tem o `whatsapp-bridge`**, clique em "New Service" duas vezes:

   **Serviço 1 — `prostec-scraper`**
   - "Deploy from Dockerfile" apontando pra `infra/prostec-scraper/scraper.Dockerfile` (ou, mais simples, "Deploy an image" com `gosom/google-maps-scraper:v1.15.0` direto e definir o start command `-web -data-folder /gmapsdata`).
   - **Volumes** → criar um volume e montar em `/gmapsdata` (guarda o estado dos jobs entre deploys).
   - **Networking** → **não gerar domínio público**. Deixe só a rede privada (`prostec-scraper.railway.internal`, porta `8080`) — é automática, não precisa configurar nada além de não clicar em "Generate Domain".

   **Serviço 2 — `prostec-scraper-gateway`**
   - "Deploy from Dockerfile" apontando pra `infra/prostec-scraper/gateway.Dockerfile` (o Caddyfile já vai junto, copiado no build).
   - **Variáveis de ambiente**:
     - `SCRAPER_API_KEY` — gere uma chave forte qualquer (ex.: `openssl rand -hex 32`). Essa é a chave que o Neotec OS também vai usar.
     - `PORT` — o Railway já injeta essa automaticamente, não precisa setar.
   - **Networking** → aqui SIM gera o domínio público ("Generate Domain"). Anote a URL (algo como `https://prostec-scraper-gateway-production.up.railway.app`).

2. **Confirme que os dois serviços estão na mesma rede privada** — no Railway, serviços do mesmo projeto já enxergam um ao outro por `<nome-do-serviço>.railway.internal` automaticamente, não precisa criar nada a mais. Se o nome do serviço 1 não for exatamente `prostec-scraper`, ajuste o `reverse_proxy` no `Caddyfile` pro nome real.

3. **Teste o gateway de fora**:
   ```bash
   curl -H "X-Api-Key: <SCRAPER_API_KEY>" https://<gateway>.up.railway.app/api/v1/jobs
   ```
   Deve devolver `{"jobs": [...]}` (ou lista vazia). Sem o header, ou com o header errado, deve devolver `401`. Tentar acessar a raiz (`/`) ou qualquer rota fora de `/api/v1/jobs*` deve devolver `404` (a UI web do gosom fica bloqueada de propósito).

## Variáveis de ambiente no Neotec OS (Vercel)

Adicione (veja também `.env.example`):

```
PROSTEC_SCRAPER_URL=https://<gateway>.up.railway.app
PROSTEC_SCRAPER_API_KEY=<mesmo valor de SCRAPER_API_KEY do gateway>
PROSTEC_SCRAPER_DEFAULT_DEPTH=5
PROSTEC_SCRAPER_MAX_TIME=600
CRON_SECRET=<gere um valor forte, se ainda não existir>
```

## Limites práticos (o próprio gosom recomenda)

- **Uma busca por vez.** Buscas em paralelo fazem o Google bloquear o
  IP do Railway por horas — por isso o cron do Neotec OS (Fase 4) só
  envia um job novo quando o anterior já terminou.
- `depth` entre 5 e 8 (a UI da Captação já limita as opções a 5/8/12).
- `email: true` (buscar e-mail no próprio Google Maps) deixa a busca
  bem mais lenta — preferimos deixar desligado e usar o enriquecimento
  próprio (`redes-sociais`/e-mail extraído do site) depois.

## Cron — resolvido via GitHub Actions (grátis)

O plano **Hobby (grátis)** da Vercel só permite cron nativo rodando **no
máximo 1x por dia** — uma entrada tipo `*/2 * * * *` no `vercel.json` é
**rejeitada pela Vercel** (o deploy nem chega a aparecer na aba
Deployments). Por isso o `vercel.json` deste projeto **não** tem mais
nenhuma entrada de cron pro scraper.

Em vez disso, `.github/workflows/prostec-scraper-cron.yml` chama a rota
`/api/prostec/scraper/cron` a cada 5 minutos, de graça, direto do
GitHub Actions (a rota não liga quem chama — só confere o header
`Authorization: Bearer $CRON_SECRET`).

**Configuração única** — em `github.com/nhew-hash/neotec-os` → *Settings*
→ *Secrets and variables* → *Actions* → *New repository secret*:
- `NEOTEC_OS_URL` — o domínio de produção (ex.: `https://neotec-os.vercel.app`, sem barra no final)
- `CRON_SECRET` — o mesmo valor da env `CRON_SECRET` configurada na Vercel

Pra testar sem esperar os 5 minutos: na aba **Actions** do repositório,
abre o workflow "Prostec Scraper — cron gratuito" e clica em **Run
workflow**.

Se preferir upgrade pro plano Pro da Vercel no futuro, o cron nativo
funciona normalmente — é só voltar a entrada no `vercel.json` e
desativar o workflow.

Enquanto o cron (de qualquer um dos dois jeitos) não estiver
funcionando, buscas ficam paradas na fila (`status = 'fila'`) — nada
quebra, só não processa sozinho.

## Smoke test

`scripts/prostec-scraper-smoke.mjs` (na raiz do projeto) cria um job de
teste pequeno e confere a resposta da API — local (`docker compose up -d`
+ `PROSTEC_SCRAPER_URL=http://localhost:8080 node scripts/prostec-scraper-smoke.mjs`)
ou contra o gateway do Railway (com `PROSTEC_SCRAPER_API_KEY` setado, também
confere que a autenticação está funcionando). Ver o topo do arquivo pros
detalhes.

## Escalar no futuro (não fazer agora)

O scraper aceita `-proxies` pra rotacionar IP e evitar bloqueio em
volume alto. Deixamos a env `PROSTEC_SCRAPER_PROXIES` prevista no
`.env.example`, comentada/vazia — só ativar se algum dia o volume de
buscas justificar o custo dos proxies.
