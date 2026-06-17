import { api } from "./api";

export type PushPlatform = {
  /** Web Push is usable right now (APIs present). */
  supported: boolean;
  isIOS: boolean;
  /** Running as an installed PWA (added to Home Screen / standalone window). */
  isStandalone: boolean;
  /** iOS in a browser tab: push only works after "Add to Home Screen". */
  needsInstall: boolean;
};

export type EnableResult = "ok" | "denied" | "unsupported" | "needs-install";

export function getPushPlatform(): PushPlatform {
  if (typeof window === "undefined") {
    return { supported: false, isIOS: false, isStandalone: false, needsInstall: false };
  }
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports as "MacIntel" but is touch-capable.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // Safari-specific standalone flag.
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  const hasApis =
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

  return {
    supported: hasApis,
    isIOS,
    isStandalone,
    needsInstall: isIOS && !isStandalone,
  };
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function registerServiceWorker(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch {
    /* registration is best-effort; push enablement handles errors itself */
  }
}

/**
 * Ensure this device is permitted and subscribed for push. Idempotent: if the
 * device already granted permission and has a subscription, this just re-syncs
 * it to the backend without prompting again.
 */
export async function ensurePushSubscription(
  getToken: () => Promise<string | null>
): Promise<EnableResult> {
  const platform = getPushPlatform();
  if (platform.needsInstall) return "needs-install";
  if (!platform.supported) return "unsupported";

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set");
    return "unsupported";
  }

  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    });
  }

  const json = sub.toJSON();
  await api(getToken).push.subscribe({
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh ?? "",
    auth: json.keys?.auth ?? "",
  });

  return "ok";
}
