import { notFound } from "next/navigation";
import { buscarOSPorId } from "@/services/assistencia/assistencia.service";
import { formatCurrency, formatDate, formatDateTime, formatWhatsapp } from "@/utils";

export default async function ImprimirOSPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ formato?: string }>;
}) {
  const { id } = await params;
  const { formato } = await searchParams;
  const os = await buscarOSPorId(id);
  if (!os) notFound();

  const isCupom = formato === "cupom";

  return (
    <div className={isCupom ? "mx-auto w-[300px] font-mono text-xs" : "font-sans text-sm"}>
      <div className="mb-4 text-center">
        <p className={isCupom ? "text-sm font-bold" : "font-display text-lg font-bold"}>NEOTEC ARAGUARI</p>
        <p className="text-xs">Ordem de Serviço {os.numero_os}</p>
      </div>

      <hr className="my-2 border-dashed border-black" />

      <div className="flex flex-col gap-1">
        <p><strong>Cliente:</strong> {os.cliente.nome}</p>
        <p><strong>WhatsApp:</strong> {formatWhatsapp(os.cliente.whatsapp)}</p>
        <p><strong>Entrada:</strong> {formatDateTime(os.data_entrada)}</p>
        {os.prazo && <p><strong>Prazo:</strong> {formatDate(os.prazo)}</p>}
        <p><strong>Status:</strong> {os.status}</p>
      </div>

      <hr className="my-2 border-dashed border-black" />

      <div className="flex flex-col gap-1">
        <p><strong>Defeito relatado:</strong></p>
        <p>{os.defeito}</p>
        {os.diagnostico && (
          <>
            <p className="mt-2"><strong>Diagnóstico:</strong></p>
            <p>{os.diagnostico}</p>
          </>
        )}
        {os.valor != null && <p className="mt-2"><strong>Valor:</strong> {formatCurrency(os.valor)}</p>}
        {os.garantia_dias && <p><strong>Garantia:</strong> {os.garantia_dias} dias após a entrega</p>}
      </div>

      <hr className="my-2 border-dashed border-black" />

      <p className="mt-4 text-center text-[10px]">
        Assinatura do cliente: _______________________________
      </p>

      {!isCupom && (
        <p className="mt-8 text-center text-[10px] text-gray-500">
          Documento gerado pelo Neotec OS — não substitui nota fiscal.
        </p>
      )}
    </div>
  );
}
