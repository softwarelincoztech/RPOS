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
    if (!payload || payload.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden. SuperAdmin only." }, { status: 403 });
    }

    const restaurants = await prisma.restaurant.findMany({
      include: {
        _count: {
          select: { branches: true, users: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ success: true, data: restaurants });

  } catch (error) {
    console.error("SuperAdmin GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("restro_token")?.value;

    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden. SuperAdmin only." }, { status: 403 });
    }

    const body = await req.json();
    const { name, slug, contactEmail, password } = body;

    if (!name || !slug || !contactEmail || !password) {
      return NextResponse.json({ error: "Name, Subdomain, Email, and Password are required" }, { status: 400 });
    }

    // Check if slug or email exists
    const existingSlug = await prisma.restaurant.findUnique({ where: { slug } });
    if (existingSlug) return NextResponse.json({ error: "Subdomain already taken" }, { status: 400 });

    const existingUser = await prisma.user.findUnique({ where: { email: contactEmail } });
    if (existingUser) return NextResponse.json({ error: "Email already in use by another user" }, { status: 400 });

    const hashedPassword = await bcrypt.hash(password, 10);
    const licenseKey = `LIC-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now()}`;
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    const restaurant = await prisma.restaurant.create({
      data: {
        name,
        slug,
        contactEmail,
        contactPhone: "",
        licenseKey,
        validUntil: nextYear,
        branches: {
          create: [{ name: "Main Branch" }]
        },
        users: {
          create: [{ 
            name: "Admin Owner", 
            email: contactEmail, 
            password: hashedPassword, 
            role: "OWNER" 
          }]
        }
      }
    });

    // We must link the new user to the branch since they need a branchId for POS
    // Find the newly created branch
    const branch = await prisma.branch.findFirst({ where: { restaurantId: restaurant.id } });
    const user = await prisma.user.findFirst({ where: { restaurantId: restaurant.id, email: contactEmail } });

    if (branch && user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { branchId: branch.id }
      });
    }

    return NextResponse.json({ success: true, data: restaurant });

  } catch (error) {
    console.error("SuperAdmin POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("restro_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, hasHR, hasInventory, hasKDS, hasDelivery, hasTables, status, validUntil } = body;

    const updated = await prisma.restaurant.update({
      where: { id },
      data: {
        hasHR,
        hasInventory,
        hasKDS,
        hasDelivery,
        hasTables,
        status,
        validUntil: validUntil ? new Date(validUntil) : undefined
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("SuperAdmin PATCH Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
