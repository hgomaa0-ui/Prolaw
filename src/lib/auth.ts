import jwt from 'jsonwebtoken';
import type { NextAuthOptions } from "next-auth";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// للحصول على token في العميل (المتصفح)
export function getAuth(): string | null {
  try {
    // Try cookie first (works on first render)
    const cookieToken = document.cookie.match(/(^| )token=([^;]+)/)?.[2] || null;
    if (cookieToken) return cookieToken;

    // Fallback to localStorage
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  } catch (error) {
    return null;
  }
}

// للحصول على token في الخادم (server)
export function getAuthServer(request: NextRequest): string | null {
  try {
    // Get token from cookies first
    const token = request.cookies.get("token")?.value;
    if (token) return token;

    // If not in cookies, try headers
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      return token;
    }

    return null;
  } catch (error) {
    return null;
  }
}

// لحفظ token
export function setAuth(token: string) {
  try {
    document.cookie = `token=${token}; Max-Age=3600; Path=/; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
  } catch (error) {
    console.error("Error setting auth:", error);
  }
}

// لمسح token
export function clearAuth() {
  try {
    // Clear from cookies
    document.cookie = `token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
  } catch (error) {
    console.error("Error clearing auth:", error);
  }
}

// ---- temporary stub to satisfy next-auth imports during build ----
export const authOptions: NextAuthOptions = {
  providers: [],
  session: { strategy: "jwt" },
};
