import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { pin, slug } = await req.json();

    if (!pin || !slug) {
      return NextResponse.json({ error: "PIN and Restaurant Code are required" }, { status: 400 });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug }
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Invalid Restaurant Code" }, { status: 404 });
    }

    const posUsers = await prisma.user.findMany({
      where: {
        restaurantId: restaurant.id,
        role: { in: ["WAITER", "CASHIER", "KITCHEN_STAFF", "MANAGER", "OWNER"] }
      }
    });

    let matchedUser = null;

    for (const user of posUsers) {
      const isValid = await bcrypt.compare(pin, user.password);
      if (isValid) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }

    const token = await signToken({
      id: matchedUser.id,
      name: matchedUser.name,
      email: matchedUser.email,
      role: matchedUser.role,
      restaurantId: matchedUser.restaurantId,
      branchId: matchedUser.branchId,
    });

    const response = NextResponse.json({ 
      success: true, 
      user: { name: matchedUser.name, role: matchedUser.role } 
    });

    response.cookies.set({
      name: "restro_token",
      value: token,
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
      sameSite: "lax",
    });

    return response;

  } catch (error) {
    console.error("POS Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
