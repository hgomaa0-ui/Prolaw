import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { runWithCompanyId } from './tenant-context';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function withCompany<T>(handler: (req: NextRequest, companyId: number | undefined) => Promise<T>) {
  return async function wrapped(req: NextRequest): Promise<T> {
    // Extract token from Authorization header or cookie
    let token = req.headers.get('authorization') || '';
    if (token.toLowerCase().startsWith('bearer ')) token = token.slice(7).trim();
    if (!token) {
      // Try cookie
      const cookie = req.cookies.get('token');
      token = cookie?.value || '';
    }
    let companyId: number | undefined;
    if (token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET) as { companyId?: number; sub?: string; id?: number };
        companyId = payload.companyId;
        if (!companyId) {
          const claim = payload.sub ?? (payload as any).id;
          const userId = claim ? parseInt(String(claim), 10) : NaN;
          if (!Number.isNaN(userId)) {
            const user = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } });
            companyId = user?.companyId;
          }
        }
      } catch {
        // token signature invalid – try decode without verify (development mode)
        try {
          const payload = jwt.decode(token) as { companyId?: number } | null;
          companyId = payload?.companyId;
        } catch {}
      }
    }

    // If companyId is still undefined but we have a valid token, derive it from the user record
    if (!companyId && token) {
      try {
        const decoded = jwt.decode(token) as { sub?: string; id?: number } | string | null;
        let claim = typeof decoded === 'string' ? decoded : decoded?.sub ?? decoded?.id;
        let userId = claim ? parseInt(String(claim), 10) : NaN;
        if (Number.isNaN(userId) && /^\d+$/.test(token)) {
          userId = parseInt(token, 10);
        }
        if (!Number.isNaN(userId)) {
          const user = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } });
          companyId = user?.companyId;
        }
      } catch {
        // ignore
      }
    }

    // fallback: companyId passed explicitly in query string (e.g. ?companyId=2)
    if (!companyId) {
      try {
        const url = new URL(req.url);
        const q = url.searchParams.get('companyId');
        if (q) companyId = Number(q);
      } catch {}
    }

    if(!companyId && token){
      try{ console.log('withCompany decoded', jwt.decode(token)); }catch{}
    }
    console.log('withCompany token', token ? 'present' : 'none', 'companyId', companyId);
    return runWithCompanyId(companyId, () => handler(req, companyId));
  };
}
