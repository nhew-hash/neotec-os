"use client";

import { useEffect } from "react";
import { rastrearVisualizacaoProduto } from "./loja-tracking-provider";

/**
 * Fase 255 — só registra, não renderiza nada visível. Colocado nas
 * páginas de produto (seminovo) e de lacrado, além do pageview
 * genérico automático (que nunca carrega produto/aparelho, só a URL).
 * Sem isso, "Produtos mais acessados" nunca tem visualização nenhuma
 * pra nenhum item, por construção — confirmado ao vivo na auditoria.
 */
export function RastrearVisualizacaoProduto({ produtoId, aparelhoId, lacradoModeloId }: { produtoId?: string; aparelhoId?: string; lacradoModeloId?: string }) {
  useEffect(() => {
    rastrearVisualizacaoProduto({ produtoId, aparelhoId, lacradoModeloId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produtoId, aparelhoId, lacradoModeloId]);

  return null;
}
