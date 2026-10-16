"use client";

/** Ajudantes do navegador para Web Push (inscrever / ler / cancelar neste aparelho). */

export type SuportePush =
  | { ok: true }
  | { ok: false; motivo: "sem_suporte" | "ios_instalar" | "bloqueado" };

export function ehIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function appInstalado(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function suportePush(): SuportePush {
  if (typeof window === "undefined") return { ok: false, motivo: "sem_suporte" };
  // No iPhone o Web Push só existe com o app adicionado à Tela de Início (iOS 16.4+).
  if (ehIOS() && !appInstalado()) return { ok: false, motivo: "ios_instalar" };
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return { ok: false, motivo: "sem_suporte" };
  if (Notification.permission === "denied") return { ok: false, motivo: "bloqueado" };
  return { ok: true };
}

function chaveParaBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(bruto.length));
  for (let i = 0; i < bruto.length; i++) bytes[i] = bruto.charCodeAt(i);
  return bytes;
}

async function registro(): Promise<ServiceWorkerRegistration> {
  const existente = await navigator.serviceWorker.getRegistration("/");
  if (existente) return existente;
  await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  return navigator.serviceWorker.ready;
}

export async function inscricaoAtual(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  return reg ? reg.pushManager.getSubscription() : null;
}

/** Pede permissão e inscreve. Lança erro com mensagem clara se a pessoa negar. */
export async function inscrever(chavePublica: string): Promise<PushSubscription> {
  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") throw new Error("Permissão de notificação negada. Libere nas configurações do navegador/celular.");
  const reg = await registro();
  const atual = await reg.pushManager.getSubscription();
  if (atual) return atual;
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(chavePublica) });
}

export function serializar(sub: PushSubscription) {
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  return { endpoint: json.endpoint ?? sub.endpoint, keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" }, userAgent: navigator.userAgent.slice(0, 300) };
}
