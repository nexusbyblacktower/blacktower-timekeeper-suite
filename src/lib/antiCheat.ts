export interface AntiCheatResult {
  score: number;
  flags: string[];
}

const SUSPECT_CAMERA = ["obs", "virtual", "manycam", "droidcam", "snap camera", "epoccam", "iriun"];

interface AntiCheatInput {
  position: GeolocationPosition | null;
  locationError: string | null;
  cameraLabel: string | null;
  retakeCount: number;
  locationName: string | null;
}

export function runAntiCheat({
  position,
  locationError,
  cameraLabel,
  retakeCount,
  locationName,
}: AntiCheatInput): AntiCheatResult {
  const flags: string[] = [];
  let score = 100;

  if (!position) {
    flags.push(`NO_GPS_FIX${locationError ? `:${locationError}` : ""}`);
    score -= 60;
  } else {
    const c = position.coords;
    if (c.accuracy > 100) {
      flags.push(`LOW_GPS_ACCURACY:${Math.round(c.accuracy)}m`);
      score -= 20;
    }
    if (c.accuracy < 1) {
      flags.push("IMPLAUSIBLE_ACCURACY");
      score -= 25;
    }
    if (c.altitude === null && c.altitudeAccuracy === null && c.speed === null && c.heading === null) {
      flags.push("SPARSE_GPS_METADATA");
      score -= 10;
    }
    const staleMs = Date.now() - position.timestamp;
    if (staleMs > 120_000) {
      flags.push(`STALE_GPS_FIX:${Math.round(staleMs / 1000)}s`);
      score -= 20;
    }
    if (Number.isInteger(c.latitude) && Number.isInteger(c.longitude)) {
      flags.push("ROUNDED_COORDINATES");
      score -= 25;
    }
  }

  if (!locationName) {
    flags.push("LOCATION_NAME_UNRESOLVED");
    score -= 10;
  }

  if (cameraLabel) {
    const lower = cameraLabel.toLowerCase();
    if (SUSPECT_CAMERA.some((s) => lower.includes(s))) {
      flags.push(`VIRTUAL_CAMERA:${cameraLabel}`);
      score -= 50;
    }
  } else {
    flags.push("CAMERA_LABEL_HIDDEN");
    score -= 5;
  }

  if (navigator.webdriver) {
    flags.push("AUTOMATED_BROWSER");
    score -= 40;
  }

  if (retakeCount >= 3) {
    flags.push(`EXCESSIVE_RETAKES:${retakeCount}`);
    score -= 10 * (retakeCount - 2);
  }

  return { score: Math.max(0, Math.min(100, score)), flags };
}

export interface PlaceInfo {
  name: string;
  details: Record<string, unknown> | null;
}

export async function resolveLocationName(lat: number, lon: number): Promise<PlaceInfo | null> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    if (!res.ok) return null;
    const d = await res.json();
    const parts = [d.locality, d.city, d.principalSubdivision, d.countryName].filter(
      (p: string, i: number, arr: string[]) => p && arr.indexOf(p) === i
    );
    const name = parts.join(", ");
    return name ? { name, details: d } : null;
  } catch {
    return null;
  }
}
