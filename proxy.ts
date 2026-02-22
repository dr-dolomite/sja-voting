import { NextRequest, NextResponse } from "next/server";
import { verifyToken, verifyVoterToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Admin routes ───────────────────────────────────────────
  if (pathname === "/login") {
    const token = request.cookies.get("session")?.value;
    if (token) {
      const session = await verifyToken(token);
      if (session) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard")) {
    const token = request.cookies.get("session")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const session = await verifyToken(token);
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // ─── Voter routes ──────────────────────────────────────────
  if (pathname === "/vote/login") {
    const token = request.cookies.get("voter-session")?.value;
    if (token) {
      const session = await verifyVoterToken(token);
      if (session) {
        return NextResponse.redirect(new URL("/vote", request.url));
      }
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/vote")) {
    const token = request.cookies.get("voter-session")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/vote/login", request.url));
    }
    const session = await verifyVoterToken(token);
    if (!session) {
      return NextResponse.redirect(new URL("/vote/login", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/vote/:path*"],
};
