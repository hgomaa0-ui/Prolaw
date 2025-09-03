import { NextRequest, NextResponse } from "next/server";
import { setCompanyContext } from "@/lib/tenant-context";
import jwt from "jsonwebtoken";
import { getAuthServer } from "@/lib/auth";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/api/login",
  "/api/register",
  "/",
  "/dashboard/clients",
  "/dashboard/clients/new",
  "/dashboard/clients/[id]"
];

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check if user is authenticated
  const token = getAuthServer(request);
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { role?: string; companyId?: number };
      setCompanyContext(payload.companyId);
    } catch {
      /* ignore invalid token here; handled later */
    }
  }
  if (!token) {
    // Redirect to login page if not authenticated
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Decode role
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { role?: string };
    const role = payload.role ?? "STAFF";
    const adminPaths = ["/admin", "/invoices"];
    if (role !== "ADMIN" && adminPaths.some(p=> pathname.startsWith(p))) {
      const dashUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(dashUrl);
    }
  } catch {
    // invalid token => redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // apply to all API routes and pages except static/image/favicon
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

