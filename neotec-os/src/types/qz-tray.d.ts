/**
 * O pacote `qz-tray` não publica tipos TypeScript, e não existe um
 * @types/qz-tray real — sem isso, o build falha com "implicitly has an
 * any type". Declaração mínima: trata o módulo como `any` de propósito
 * (é exatamente o que já estava acontecendo em runtime, só formaliza
 * isso pro TypeScript não travar o build).
 */
declare module "qz-tray";
