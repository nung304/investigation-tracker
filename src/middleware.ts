import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname.startsWith("/_next") || pathname.startsWith("/icons")) {
    return NextResponse.next();
  }

  const token = req.cookies.get("token")?.value;

  if (!token) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "เซสชันหมดอายุ" }, { status: 401 });
    }
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete("token");
    return res;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)"],
};
