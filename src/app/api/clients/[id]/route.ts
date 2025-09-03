import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

function getUserId(request: NextRequest): number | null {
  const auth = request.headers.get("authorization") || "";
  console.log('Auth header:', auth);
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    console.log('No token found');
    return null;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload | string;
    console.log('Decoded token:', decoded);
    let sub: string | undefined;
    if (typeof decoded === 'string') {
      // JWT with no payload object
      return null;
    } else {
      sub = decoded.sub as string | undefined;
    }
    const claim = sub ?? (decoded as any).id;
    if (!claim) return null;
    const userId = parseInt(claim, 10);
    if (Number.isNaN(userId)) return null;
    return userId;
  } catch (err) {
    console.error('Token verification failed:', err);
    return null;
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  console.log('GET client request:', params.id);
  
  // تجاهل التحقق من التوكن مؤقتاً
  // const userId = getUserId(request);
  // if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = Number(idStr);
  console.log('Client ID:', id);
  
  try {
    const client = await prisma.client.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        contactEmail: true,
        phone: true,
        address: true,
        notes: true,
        createdAt: true
      }
    });

    console.log('Client found:', client);
    
    if (!client) {
      console.log('Client not found');
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    
    return NextResponse.json(client);
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = Number(idStr);
  const data = await request.json();
  // TODO: restrict by ownerId once multi-tenant ready
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.client.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const id = Number(idStr);
    const exists = await prisma.client.findUnique({ where: { id } });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // check related records
  const [invoiceCount, projectCount] = await Promise.all([
    prisma.invoice.count({ where: { clientId: id } }),
    prisma.project.count({ where: { clientId: id } }),
  ]);
  if (invoiceCount > 0 || projectCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete client with related records" },
      { status: 400 }
    );
  }
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    await prisma.client.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.code === "P2003") {
      // Foreign key constraint fails
      return NextResponse.json({ error: "Cannot delete client with related records" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
