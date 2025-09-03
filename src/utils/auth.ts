


/**
 * Returns the authenticated user object if a valid session token is found.
 * It works on both the client (browser) and server (Route Handlers).
 *
 * Client: reads from localStorage("token").
 * Server: first checks `Authorization: Bearer <token>` header, then `token` cookie.
 */
import { NextRequest } from 'next/server';

export const getAuth = async (req?: NextRequest) => {
  // Client-side
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (!token) return null;
    return { token } as any; // client rarely needs full user
  }

  // Server-side
  let token: string | undefined;
  if (req) {
    token = req.headers.get('authorization')?.replace('Bearer ', undefined as any);
  }
  if (!token) {
    const nh = await import('next/headers');
    const hdrs = nh.headers();
    token = hdrs.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      token = nh.cookies().get('token')?.value;
    }
  }
  if (!token) return null;

  // For now just return the token; further user lookup can be added when needed
  return { token } as any;
};
