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
    if (!payload || !payload.restaurantId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      where: { restaurantId: payload.restaurantId },
      include: {
        items: true
      },
      orderBy: { sortOrder: "asc" }
    });

    return NextResponse.json({ success: true, data: categories });

  } catch (error) {
    console.error("Menu GET Error:", error);
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

    const body = await req.json();
    const { action, name, description, price, categoryId, icon } = body;

    if (action === "ADD_CATEGORY") {
      if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
      const newCategory = await prisma.category.create({
        data: {
          name,
          icon: icon || "🏷️",
          restaurantId: payload.restaurantId,
          sortOrder: 0
        }
      });
      return NextResponse.json({ success: true, data: newCategory });
    } 
    
    if (action === "ADD_ITEM") {
      if (!name || !price || !categoryId) {
        return NextResponse.json({ error: "Name, price, and category are required" }, { status: 400 });
      }
      const newItem = await prisma.menuItem.create({
        data: {
          name,
          description: description || "",
          price: parseFloat(price),
          categoryId,
          restaurantId: payload.restaurantId,
          isAvailable: true
        }
      });
      return NextResponse.json({ success: true, data: newItem });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Menu POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
