# Serviço "prostec-scraper-gateway" no Railway — o único dos dois
# serviços com domínio público. Caddy fazendo autenticação por
# X-API-Key + reverse proxy pra rede privada do prostec-scraper.

FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
