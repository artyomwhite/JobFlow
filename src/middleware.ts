import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/login" || path === "/register") return NextResponse.next();
  const hasSessionCookie = request.cookies.getAll().some((cookie) => cookie.name.includes("session_token"));
  if (hasSessionCookie) return NextResponse.next();
  if (path.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const login = new URL("/login", request.url);
  login.searchParams.set("from", path);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/((?!api/auth|api/setup|_next/static|_next/image|favicon.ico).*)"] };
