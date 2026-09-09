/**
 * Motor de templates do módulo de impressão. Templates ficam guardados
 * no banco (`documento_templates`), não presos ao React — isso permite
 * editar layout, criar modelo novo, sem precisar de deploy. O React só
 * injeta o HTML já pronto numa página de impressão.
 *
 * SEGURANÇA: os VALORES substituídos nos placeholders passam por escape
 * de HTML — o texto do template em si é confiável (só admin/gerente
 * edita, via RLS), mas os DADOS (defeito relatado, observações, nome de
 * cliente) vêm de gente digitando no sistema, e não devem conseguir
 * injetar HTML/script no documento impresso.
 */

function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export type ValoresTemplate = Record<string, string | number | null | undefined>;

/**
 * Dois tipos de placeholder:
 * - {{chave}} — valor escapado (nome de cliente, defeito relatado,
 *   observações... qualquer coisa que alguém digitou no sistema, nunca
 *   deve virar HTML/script no documento impresso).
 * - {{{chave}}} — HTML cru, sem escape (usado só pros blocos já
 *   montados por código nosso, como o QR Code e o checklist — nunca
 *   pra dado de formulário).
 * A ordem importa: processa tripla chave primeiro, senão a regex da
 * dupla combinaria com um pedaço da tripla.
 */
export function renderizarTemplate(html: string, valores: ValoresTemplate): string {
  let resultado = html.replace(/\{\{\{(\w+)\}\}\}/g, (_match, chave: string) => {
    const valor = valores[chave];
    return valor === null || valor === undefined ? "" : String(valor);
  });

  resultado = resultado.replace(/\{\{(\w+)\}\}/g, (_match, chave: string) => {
    const valor = valores[chave];
    if (valor === null || valor === undefined) return "";
    return escaparHtml(String(valor));
  });

  return resultado;
}

export interface ItemChecklist {
  label: string;
  valor: boolean | null | undefined;
}

/**
 * Monta o bloco HTML do checklist — usado via placeholder único
 * {{checklist}}, porque tentar ter um placeholder pra cada um dos ~15
 * itens deixaria o template ilegível pra quem for editar. Item não
 * preenchido (null) mostra "—", não some da lista.
 */
export function montarBlocoChecklist(itens: ItemChecklist[]): string {
  const linhas = itens
    .map((item) => {
      const marca = item.valor === true ? "✓" : item.valor === false ? "✗" : "—";
      return `<span style="display:inline-block;width:48%;padding:2px 0;">${marca} ${escaparHtml(item.label)}</span>`;
    })
    .join("");
  return `<div style="display:flex;flex-wrap:wrap;">${linhas}</div>`;
}
