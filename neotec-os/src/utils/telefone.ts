/**
 * O telefone é salvo no cadastro do cliente SEM código de país (só DDD +
 * número, 10 ou 11 dígitos — ver clientes.schema.ts). Isso nunca deu
 * problema em nada que só lê/exibe o telefone, mas quebra na hora de
 * enviar de verdade: tanto a Meta Cloud API quanto o WhatsApp Web
 * (resolução de JID via onWhatsApp) esperam o número completo, com "55"
 * na frente. Normaliza aqui, uma vez só, no momento de enviar — não
 * mexe no que já está salvo no banco.
 */
export function paraFormatoInternacionalBR(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.startsWith("55") && digitos.length >= 12) return digitos;
  return `55${digitos}`;
}

/**
 * Caminho inverso — usado quando uma mensagem CHEGA (Meta e WhatsApp Web
 * mandam o telefone completo, com "55") e precisa comparar/gravar contra
 * `clientes.whatsapp`, que nunca tem o "55" (ver clientes.schema.ts).
 * Sem isso, a automação nunca casava com cliente já cadastrado — criava
 * um cliente duplicado a cada mensagem, mesmo de quem já tinha conta.
 */
export function paraFormatoLocalBR(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.startsWith("55") && digitos.length >= 12) return digitos.slice(2);
  return digitos;
}
