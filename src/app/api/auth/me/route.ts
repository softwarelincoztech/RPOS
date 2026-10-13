import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("restro_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.id) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      include: {
        restaurant: {
          select: { 
            name: true, 
            logoUrl: true,
            hasHR: true,
            hasInventory: true,
            hasKDS: true,
            hasDelivery: true,
            hasTables: true
          }
        }
      }
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({ 
      success: true, 
      user: {
        name: user.name,
        role: user.role,
        restaurant: user.restaurant ? {
          name: user.restaurant.name,
          logoUrl: user.restaurant.logoUrl,
          hasHR: user.restaurant.hasHR,
          hasInventory: user.restaurant.hasInventory,
          hasKDS: user.restaurant.hasKDS,
          hasDelivery: user.restaurant.hasDelivery,
          hasTables: user.restaurant.hasTables,
        } : null
      }
    });
  } catch (error) {
    console.error("Auth Me Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
