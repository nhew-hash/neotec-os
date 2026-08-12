import { listarLacradosModelosPublico } from "@/services/lacrados/lacrados-publico.service";
import { LacradosListaCliente } from "@/components/loja/lacrados-lista-cliente";

export default async function AndroidListaPage() {
  const todos = await listarLacradosModelosPublico();
  const modelosAndroid = todos.filter((m) => m.marca?.toLowerCase() !== "apple");

  return (
    <LacradosListaCliente
      modelos={modelosAndroid}
      titulo="Android"
      descricao="Aparelhos novos, lacrados de fábrica, com comprovante de compra e garantia."
    />
  );
}
