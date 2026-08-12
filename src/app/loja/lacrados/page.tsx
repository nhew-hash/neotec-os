import { listarLacradosModelosPublico } from "@/services/lacrados/lacrados-publico.service";
import { LacradosListaCliente } from "@/components/loja/lacrados-lista-cliente";

export default async function LacradosListaPage() {
  const todos = await listarLacradosModelosPublico();
  const modelosApple = todos.filter((m) => m.marca?.toLowerCase() === "apple" && /iphone/i.test(m.nome));

  return (
    <LacradosListaCliente
      modelos={modelosApple}
      titulo="iPhone Lacrado"
      descricao="Aparelhos novos, lacrados de fábrica, com comprovante de compra e garantia Apple."
    />
  );
}
