/**
 * BLACKTOWER™ CRYPTOGRAPHIC INTEGRITY ENGINE (LEVEL 2 — DETERMINISTIC)
 *
 * Implements real SHA-256 hashing via Web Crypto API over canonicalized proof metadata
 * and image byte arrays, plus CSPRNG reference number generation.
 *
 * Base64 is NEVER treated as a cryptographic digest.
 */

export interface CanonicalProofInput {
  refNumber: string;
  isoTime: string;
  unixTime: number;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  imageBase64?: string | null;
  deviceInfo?: string | null;
}

export interface ProofIntegrityDigest {
  /** Full 64-character lowercase hexadecimal SHA-256 digest */
  sha256Hex: string;
  /** 16-character uppercase display prefix for visual HUD watermarks */
  shortFingerprint: string;
  /** SHA-256 of the raw image bytes alone (64-char hex) */
  imageSha256Hex: string;
  /** Canonical string that was bound into the final digest */
  canonicalPayload: string;
  /** Deterministic verification timestamp */
  computedAtIso: string;
}

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Generates a collision-resistant reference number using Web Crypto CSPRNG
 * (`crypto.getRandomValues`) instead of `Math.random()`.
 */
export function generateSecureRefNumber(nowMs: number = Date.now()): string {
  const timestamp = Math.max(0, Math.floor(nowMs)).toString(36).toUpperCase();
  const randomBytes = new Uint32Array(6);
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(randomBytes);
  } else {
    throw new Error("Web Crypto CSPRNG unavailable for secure reference generation");
  }

  let randomSuffix = "";
  for (let i = 0; i < randomBytes.length; i++) {
    randomSuffix += REF_ALPHABET[randomBytes[i] % REF_ALPHABET.length];
  }
  return `BT-${timestamp}-${randomSuffix}`;
}

/**
 * Converts an ArrayBuffer or Uint8Array into a 64-character lowercase hex string.
 */
export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

/**
 * Decodes a data URL or raw base64 string into a Uint8Array of bytes.
 */
export function base64ToUint8Array(base64OrDataUrl: string): Uint8Array {
  const clean = base64OrDataUrl.includes(",")
    ? base64OrDataUrl.split(",")[1]
    : base64OrDataUrl;
  const trimmed = clean.trim();
  if (!trimmed) return new Uint8Array(0);

  const binaryString = atob(trimmed);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Computes a real SHA-256 digest (hex string) over a UTF-8 string or Uint8Array
 * using the standard Web Crypto API (`crypto.subtle.digest`).
 */
export async function sha256DigestHex(data: string | Uint8Array): Promise<string> {
  const bytes =
    typeof data === "string" ? new TextEncoder().encode(data) : data;
  // Pass an explicit ArrayBuffer slice to satisfy strict BufferSource typing across environments
  const arrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", arrayBuffer);
  return bufferToHex(hashBuffer);
}

/**
 * Builds the canonical deterministic string for a proof event so client and server
 * can independently compute and verify the exact same SHA-256 digest.
 */
export function buildCanonicalProofString(
  input: CanonicalProofInput,
  imageSha256Hex: string
): string {
  const latStr =
    input.latitude !== null && input.latitude !== undefined && Number.isFinite(input.latitude)
      ? input.latitude.toFixed(6)
      : "NULL";
  const lonStr =
    input.longitude !== null && input.longitude !== undefined && Number.isFinite(input.longitude)
      ? input.longitude.toFixed(6)
      : "NULL";
  const accStr =
    input.accuracy !== null && input.accuracy !== undefined && Number.isFinite(input.accuracy)
      ? Math.round(input.accuracy).toString()
      : "NULL";

  return [
    "BT-PROOF-V1",
    input.refNumber.trim(),
    input.isoTime.trim(),
    String(Math.floor(input.unixTime)),
    latStr,
    lonStr,
    accStr,
    imageSha256Hex.toLowerCase(),
  ].join("|");
}

/**
 * Computes the complete SHA-256 cryptographic proof digest binding:
 * - proof reference number
 * - ISO-8601 timestamp & Unix epoch seconds
 * - GPS coordinates & accuracy
 * - raw image bytes SHA-256 digest
 */
export async function computeProofSha256(
  input: CanonicalProofInput
): Promise<ProofIntegrityDigest> {
  let imageSha256Hex = "0".repeat(64);
  if (input.imageBase64 && input.imageBase64.trim().length > 0) {
    const imgBytes = base64ToUint8Array(input.imageBase64);
    if (imgBytes.length > 0) {
      imageSha256Hex = await sha256DigestHex(imgBytes);
    }
  }

  const canonicalPayload = buildCanonicalProofString(input, imageSha256Hex);
  const sha256Hex = await sha256DigestHex(canonicalPayload);

  return {
    sha256Hex,
    shortFingerprint: sha256Hex.slice(0, 16).toUpperCase(),
    imageSha256Hex,
    canonicalPayload,
    computedAtIso: new Date().toISOString(),
  };
}

/**
 * Verifies whether a stored hash string is a genuine 64-character hexadecimal SHA-256 digest
 * (rejecting legacy 16-char Base64 strings).
 */
export function isValidSha256Hex(hash: string | null | undefined): boolean {
  if (!hash || typeof hash !== "string") return false;
  return /^[a-f0-9]{64}$/i.test(hash.trim());
}
