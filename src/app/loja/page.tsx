import { redirect } from "next/navigation";

/**
 * A Loja Virtual agora é externa (neotecbrasil.com) — esta rota interna
 * só existe como rede de segurança, caso algum link antigo (favorito,
 * QR code impresso, etc.) ainda aponte pra cá.
 */
export default function LojaVirtualRedirectPage() {
  redirect("https://neotecbrasil.com");
}
