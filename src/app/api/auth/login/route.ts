import { NextResponse } from "next/server";
import { checkCredentials, createToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  if (!checkCredentials(username, password)) {
    return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
  }

  const token = await createToken(username);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
