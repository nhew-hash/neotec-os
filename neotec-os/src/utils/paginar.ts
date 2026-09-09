/**
 * Função utilitária pura (sem "use client") — precisa ficar separada do
 * componente Pagination porque Server Components não conseguem chamar
 * diretamente uma função exportada de um arquivo "use client" (o bundler
 * trata todo export desses arquivos como referência de cliente, mesmo
 * que não seja um componente React).
 */
export function paginar<T>(itens: T[], pagina: number, porPagina: number): T[] {
  const inicio = (pagina - 1) * porPagina;
  return itens.slice(inicio, inicio + porPagina);
}
