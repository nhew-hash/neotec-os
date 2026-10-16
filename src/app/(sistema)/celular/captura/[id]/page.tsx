import { notFound } from "next/navigation";
import { obterCapturaAction } from "@/services/celular/celular.actions";
import { CapturaCelular } from "@/components/celular/captura-celular";

export default async function CapturaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await obterCapturaAction(id);
  if (!r.success) {
    if (r.error.startsWith("Pedido não encontrado") || r.error === "Pedido inválido.") notFound();
    return <p role="alert" className="text-sm text-danger">{r.error}</p>;
  }
  return (
    <div className="mx-auto w-full max-w-md">
      <CapturaCelular captura={r.data} />
    </div>
  );
}
