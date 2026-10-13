import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("restro_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.branchId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { orderId, paymentMethod, amountPaid } = await req.json();

    if (!orderId || !paymentMethod) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // Mark Order as PAID
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: "PAID" }
    });

    // Record Payment
    await prisma.payment.create({
      data: {
        orderId,
        amount: amountPaid || order.total,
        method: paymentMethod,
        status: "COMPLETED"
      }
    });

    // Free the Table if applicable
    if (order.tableId) {
      await prisma.restaurantTable.update({
        where: { id: order.tableId },
        data: { status: "AVAILABLE" }
      });
    }

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error("Settle Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
