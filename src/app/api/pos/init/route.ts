import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("restro_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.restaurantId) {
      return NextResponse.json({ error: "Invalid token or tenant missing" }, { status: 401 });
    }

    // In a multi-branch setup, Waiters are assigned to a branchId
    const branchId = payload.branchId;

    if (!branchId) {
      return NextResponse.json({ error: "User is not assigned to a branch" }, { status: 403 });
    }

    // Fetch Tables for the branch
    const tables = await prisma.restaurantTable.findMany({
      where: { branchId },
      orderBy: { name: "asc" }
    });

    // Fetch Categories for the restaurant
    const categories = await prisma.category.findMany({
      where: { restaurantId: payload.restaurantId },
      orderBy: { sortOrder: "asc" }
    });

    // Fetch Menu Items for the restaurant
    const menuItems = await prisma.menuItem.findMany({
      where: { restaurantId: payload.restaurantId },
      orderBy: { name: "asc" }
    });

    // We also need to find any ACTIVE orders for these tables so the POS knows they are locked
    const activeOrders = await prisma.order.findMany({
      where: {
        branchId,
        status: { in: ["PENDING", "PREPARING", "READY", "SERVED"] },
        tableId: { not: null }
      },
      include: {
        items: true
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        tables,
        categories,
        menuItems,
        activeOrders
      }
    });

  } catch (error) {
    console.error("POS Init Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
