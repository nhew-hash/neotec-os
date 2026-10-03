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
export function RastrearVisualizacaoProduto({
  produtoId, aparelhoId, lacradoModeloId, nome, valor,
}: { produtoId?: string; aparelhoId?: string; lacradoModeloId?: string; nome?: string; valor?: number }) {
  useEffect(() => {
    rastrearVisualizacaoProduto({ produtoId, aparelhoId, lacradoModeloId, nome, valor });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produtoId, aparelhoId, lacradoModeloId, nome, valor]);

  return null;
}
