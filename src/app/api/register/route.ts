import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, companyName } = body as {
      name?: string;
      email?: string;
      password?: string;
      companyName?: string;
    };


    if (!name || !email || !password || !companyName) {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // ensure company name is unique
    const existingCompany = await prisma.company.findUnique({ where: { name: companyName } });
    if (existingCompany) {
      return NextResponse.json({ error: "Company name already exists" }, { status: 409 });
    }

    // create new company tenant first
    const company = await prisma.company.create({
      data: { name: companyName },
    });

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "OWNER",
        companyId: company.id,
      },
    });

    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name },
      { status: 201 }
    );
  } catch (err) {
    console.error("/api/register error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
