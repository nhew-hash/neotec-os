# Serviço "prostec-scraper" no Railway.
#
# Usa a imagem oficial do gosom/google-maps-scraper direto — este
# Dockerfile só existe pra deixar explícito no repo qual versão está em
# uso e permitir customizações futuras (proxies, etc.) sem depender de
# configurar a imagem manualmente na UI do Railway.
#
# SEM porta pública: o Railway só deve gerar domínio pro serviço
# "prostec-scraper-gateway" (Caddy). Este serviço fica acessível apenas
# pela rede privada do Railway em prostec-scraper.railway.internal:8080.

FROM gosom/google-maps-scraper:v1.15.0

# Volume persistente — configurar em infra/prostec-scraper/README.md
# (Railway: "Volumes" → montar em /gmapsdata).
VOLUME ["/gmapsdata"]

EXPOSE 8080

# "-web": sobe a API HTTP (sem isso o container só roda uma busca via
# CLI e sai). "-data-folder": onde ele guarda o estado dos jobs.
CMD ["-web", "-data-folder", "/gmapsdata"]
