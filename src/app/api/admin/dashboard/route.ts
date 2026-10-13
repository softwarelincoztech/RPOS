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
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const restaurantId = payload.restaurantId;
    const branchId = payload.branchId;

    // Get today's start and end dates
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Filter by branch if user has branchId, otherwise restaurant-wide
    const whereClause = branchId ? { branchId } : { branch: { restaurantId } };
    const todayWhereClause = { ...whereClause, createdAt: { gte: startOfDay, lte: endOfDay } };

    // 1. Total Revenue Today (Only completed/served orders)
    const completedOrders = await prisma.order.findMany({
      where: {
        ...todayWhereClause,
        status: { in: ["SERVED", "COMPLETED"] } // Assuming SERVED or COMPLETED means paid
      }
    });
    
    const totalRevenue = completedOrders.reduce((acc, order) => acc + order.total, 0);
    const totalOrders = completedOrders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // 2. Active Orders
    const activeOrdersCount = await prisma.order.count({
      where: {
        ...whereClause,
        status: { in: ["PENDING", "PREPARING", "READY"] }
      }
    });

    // 3. Recent Orders
    const recentOrders = await prisma.order.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        table: true,
        user: {
          select: { name: true }
        }
      }
    });

    // 4. Staff Count
    const staffCount = await prisma.user.count({
      where: { restaurantId }
    });

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        activeOrdersCount,
        recentOrders,
        staffCount
      }
    });

  } catch (error) {
    console.error("Admin Dashboard Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
