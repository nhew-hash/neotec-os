import { MessagesSquare } from "lucide-react";

export default function ComunicacaoIndexPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-card shadow-card">
        <MessagesSquare className="h-5 w-5 text-muted-foreground" aria-hidden />
      </span>
      <div>
        <p className="text-sm font-medium text-foreground">Selecione uma conversa</p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">O cadastro do cliente, a oportunidade no CRM e as propostas aparecem ao lado da conversa.</p>
      </div>
    </div>
  );
}
