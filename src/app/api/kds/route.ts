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
    if (!payload || !payload.branchId) {
      return NextResponse.json({ error: "Invalid token or tenant missing" }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      where: {
        branchId: payload.branchId,
        status: { in: ["PENDING", "PREPARING"] }
      },
      include: {
        items: {
          include: {
            menuItem: true
          }
        },
        table: true,
        user: {
          select: { name: true }
        }
      },
      orderBy: {
        createdAt: "asc" // Oldest orders first
      }
    });

    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    console.error("KDS GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("restro_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.branchId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { orderId, status } = await req.json();

    if (!orderId || !status) {
      return NextResponse.json({ error: "Missing orderId or status" }, { status: 400 });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status }
    });

    return NextResponse.json({ success: true, data: updatedOrder });
  } catch (error) {
    console.error("KDS PUT Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
