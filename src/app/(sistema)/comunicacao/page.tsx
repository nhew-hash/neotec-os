import { MessagesSquare } from "lucide-react";

export default function ComunicacaoIndexPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
      <MessagesSquare className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Selecione uma conversa para começar</p>
    </div>
  );
}
