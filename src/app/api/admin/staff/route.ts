import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("restro_token")?.value;

    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.restaurantId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const staff = await prisma.user.findMany({
      where: { restaurantId: payload.restaurantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        branch: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ success: true, data: staff });

  } catch (error) {
    console.error("Staff GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("restro_token")?.value;

    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.restaurantId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Only OWNER or MANAGER or HR can add staff
    if (!["OWNER", "MANAGER", "HR"].includes(payload.role)) {
      return NextResponse.json({ error: "Forbidden. Not enough permissions." }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, role, branchId } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        restaurantId: payload.restaurantId,
        branchId: branchId || payload.branchId || null
      }
    });

    return NextResponse.json({ success: true, data: { id: newUser.id, name: newUser.name } });

  } catch (error) {
    console.error("Staff POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
