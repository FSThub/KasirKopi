/**
 * Autentikasi sederhana untuk membatasi akses kasir.
 * - Kredensial (username/password) disimpan di environment variable (server).
 * - Sesi berupa cookie httpOnly berisi token ber-tanda-tangan HMAC-SHA256.
 * Memakai Web Crypto agar berjalan di Node (route handler) maupun Edge (middleware).
 */

export const SESSION_COOKIE = "kk_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 hari

const enc = new TextEncoder();
const secret = () => process.env.AUTH_SECRET || "";

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlToBytes(s: string): Uint8Array {
  const b = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return bytesToB64url(new Uint8Array(sig));
}

/** Perbandingan konstan-waktu (mengurangi timing attack). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function createToken(username: string): Promise<string> {
  const payload = bytesToB64url(
    enc.encode(JSON.stringify({ u: username, exp: Date.now() + SESSION_MAX_AGE * 1000 }))
  );
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

export async function verifyToken(token: string | undefined | null): Promise<{ u: string } | null> {
  if (!token || !secret()) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = await hmac(payload);
  if (!safeEqual(sig, expected)) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(b64urlToBytes(payload)));
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return { u: String(data.u) };
  } catch {
    return null;
  }
}

/** Cek kredensial terhadap environment variable. */
export function checkCredentials(username: string, password: string): boolean {
  const U = process.env.AUTH_USERNAME || "";
  const P = process.env.AUTH_PASSWORD || "";
  if (!U || !P) return false;
  return safeEqual(username, U) && safeEqual(password, P);
}
