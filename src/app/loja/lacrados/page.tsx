import { listarLacradosModelosPublico } from "@/services/lacrados/lacrados-publico.service";
import { LacradosListaCliente } from "@/components/loja/lacrados-lista-cliente";

export default async function LacradosListaPage() {
  const modelos = await listarLacradosModelosPublico();
  return <LacradosListaCliente modelos={modelos} />;
}
