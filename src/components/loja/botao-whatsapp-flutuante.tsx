import { MessageCircle } from "lucide-react";
import { LinkWhatsappContato } from "./link-whatsapp-contato";

/** Atalho de atendimento sempre à mão (dispara o evento Contact do Meta Pixel, igual ao link do rodapé). */
export function BotaoWhatsappFlutuante() {
  return (
    <LinkWhatsappContato className="fixed bottom-[88px] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_-8px_rgba(37,211,102,0.6)] transition-transform hover:scale-105 lg:bottom-6 lg:right-6">
      <MessageCircle className="h-6 w-6" strokeWidth={2} aria-hidden />
      <span className="sr-only">Falar com a Neotec no WhatsApp</span>
    </LinkWhatsappContato>
  );
}
