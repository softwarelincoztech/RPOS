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

    const { searchParams } = new URL(req.url);
    const tableId = searchParams.get("tableId");

    const whereClause: any = {
      status: { in: ["PENDING", "PREPARING", "READY", "SERVED"] },
      branch: { restaurantId: payload.restaurantId }
    };

    if (payload.branchId && !["OWNER", "MANAGER"].includes(payload.role)) {
      whereClause.branchId = payload.branchId;
    }

    if (tableId) {
      whereClause.tableId = tableId;
      const activeOrder = await prisma.order.findFirst({
        where: whereClause,
        include: { items: { include: { menuItem: true } } }
      });
      return NextResponse.json({ success: true, activeOrder });
    }

    const activeOrders = await prisma.order.findMany({
      where: whereClause,
      include: { 
        items: { include: { menuItem: true } },
        table: true,
        rider: true,
        user: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ success: true, activeOrders });

  } catch (error) {
    console.error("Orders GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("restro_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.restaurantId || !payload.branchId) {
      return NextResponse.json({ error: "Invalid token or tenant missing" }, { status: 401 });
    }

    const body = await req.json();
    const { tableId, orderType, items, total, tax, subtotal, existingOrderId } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Order must contain items" }, { status: 400 });
    }

    if (existingOrderId) {
      // OVERWRITE items
      await prisma.orderItem.deleteMany({ where: { orderId: existingOrderId } });
      
      const updatedOrder = await prisma.order.update({
        where: { id: existingOrderId },
        data: {
          total,
          tax,
          status: "PENDING", // Resend to kitchen
          items: {
            create: items.map((item: any) => ({
              menuItemId: item.id || item.menuItemId,
              quantity: item.quantity,
              price: item.price,
              notes: item.notes || ""
            }))
          }
        }
      });
      return NextResponse.json({ success: true, order: updatedOrder });
    }

    // Check if table is already occupied (shouldn't happen if they clicked to update, but just in case)
    if (tableId) {
      const existingOrder = await prisma.order.findFirst({
        where: {
          tableId,
          status: { in: ["PENDING", "PREPARING", "READY", "SERVED"] }
        }
      });

      if (existingOrder) {
        return NextResponse.json({ error: "Table is currently occupied. Please update the existing bill instead." }, { status: 400 });
      }
    }

    // Generate Order Number
    const count = await prisma.order.count({ where: { branchId: payload.branchId } });
    const orderNumber = `#ORD-${String(count + 1000).padStart(4, '0')}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        orderType,
        total,
        tax,
        discount: 0,
        branchId: payload.branchId,
        tableId: tableId || null,
        userId: payload.id, // The Waiter who took the order
        status: "PENDING",
        items: {
          create: items.map((item: any) => ({
            menuItemId: item.id || item.menuItemId,
            quantity: item.quantity,
            price: item.price,
            notes: item.notes || ""
          }))
        }
      }
    });

    // Update Table Status
    if (tableId) {
      await prisma.restaurantTable.update({
        where: { id: tableId },
        data: { status: "OCCUPIED" }
      });
    }

    return NextResponse.json({
      success: true,
      order
    });

  } catch (error) {
    console.error("POS Order Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
