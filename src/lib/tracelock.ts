export interface Operator {
  telegramId: string;
  name: string;
}

export const OPERATORS: Operator[] = [
  { telegramId: "6973122708", name: "Kelvin Ong" },
  { telegramId: "1579650122", name: "Lee Zi Xuan" },
];

const STORAGE_KEY = "blacktower.operator.id";

interface TelegramWebAppUser {
  id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

function telegramWebAppUser(): TelegramWebAppUser | null {
  const tg = (window as unknown as {
    Telegram?: { WebApp?: { initDataUnsafe?: { user?: TelegramWebAppUser }; ready?: () => void } };
  }).Telegram?.WebApp;
  try {
    tg?.ready?.();
  } catch {
    /* noop */
  }
  return tg?.initDataUnsafe?.user ?? null;
}

/** Resolve the capturing operator: Telegram WebApp > URL param > saved choice. */
export function detectOperator(): { operator: Operator | null; source: string } {
  const tgUser = telegramWebAppUser();
  if (tgUser?.id) {
    const id = String(tgUser.id);
    const known = OPERATORS.find((o) => o.telegramId === id);
    return {
      operator:
        known ?? {
          telegramId: id,
          name: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ") ||
            (tgUser.username ? `@${tgUser.username}` : `TG ${id}`),
        },
      source: "TELEGRAM WEBAPP",
    };
  }

  const param = new URLSearchParams(window.location.search).get("tg");
  if (param) {
    const known = OPERATORS.find((o) => o.telegramId === param);
    if (known) return { operator: known, source: "LINK PARAM" };
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const known = OPERATORS.find((o) => o.telegramId === saved);
    if (known) return { operator: known, source: "DEVICE MEMORY" };
  }

  return { operator: null, source: "UNIDENTIFIED" };
}

export function rememberOperator(telegramId: string) {
  localStorage.setItem(STORAGE_KEY, telegramId);
}

/** Best-effort readable device name from the user agent. */
export function deviceName(): string {
  const ua = navigator.userAgent;
  const uaData = (navigator as unknown as { userAgentData?: { platform?: string; brands?: { brand: string }[] } })
    .userAgentData;

  let model = "Unknown device";
  const android = ua.match(/Android [\d.]+; ([^;)]+)/);
  if (android) model = android[1].trim();
  else if (/iPhone/.test(ua)) model = "iPhone";
  else if (/iPad/.test(ua)) model = "iPad";
  else if (/Macintosh/.test(ua)) model = "Mac";
  else if (/Windows NT/.test(ua)) model = "Windows PC";
  else if (/Linux/.test(ua)) model = uaData?.platform || "Linux device";

  let browser = "Browser";
  if (/EdgA?\//.test(ua)) browser = "Edge";
  else if (/OPR\//.test(ua)) browser = "Opera";
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua)) browser = "Safari";

  return `${model} · ${browser}`;
}

/** Reverse geocode to a human-readable place name (OpenStreetMap Nominatim). */
export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { display_name?: string };
    return json.display_name ?? null;
  } catch {
    return null;
  }
}
