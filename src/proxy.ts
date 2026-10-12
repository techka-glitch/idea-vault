import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, isValidSessionCookieValue } from "@/lib/session";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/icon.png" ||
    pathname === "/apple-icon.png" ||
    pathname === "/icon-192.png" ||
    pathname === "/icon-512.png";

  if (isPublic) return NextResponse.next();

  if (!isValidSessionCookieValue(request.cookies.get(COOKIE_NAME)?.value)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
