import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("restro_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.branchId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    // Fetch Delivery Orders
    const orders = await prisma.order.findMany({
      where: {
        branchId: payload.branchId,
        orderType: "DELIVERY",
        status: { in: ["READY", "OUT_FOR_DELIVERY"] }
      },
      include: {
        rider: { select: { id: true, name: true } },
        items: { include: { menuItem: { select: { name: true } } } }
      },
      orderBy: { updatedAt: "desc" }
    });

    // Fetch Riders
    const riders = await prisma.user.findMany({
      where: {
        restaurantId: payload.restaurantId,
        role: "RIDER"
      },
      select: { id: true, name: true }
    });

    return NextResponse.json({ success: true, data: { orders, riders, currentUserRole: payload.role, currentUserId: payload.id } });
  } catch (error) {
    console.error("Delivery GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("restro_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.branchId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { action, orderId, riderId } = await req.json();

    if (action === "ASSIGN_RIDER") {
      if (!orderId || !riderId) return NextResponse.json({ error: "Order ID and Rider ID are required" }, { status: 400 });

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          riderId,
          status: "OUT_FOR_DELIVERY"
        }
      });
      return NextResponse.json({ success: true, data: updatedOrder });
    }

    if (action === "MARK_DELIVERED") {
      if (!orderId) return NextResponse.json({ error: "Order ID required" }, { status: 400 });

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: "COMPLETED" // Marking as delivered finishes the lifecycle
        }
      });
      return NextResponse.json({ success: true, data: updatedOrder });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Delivery POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
