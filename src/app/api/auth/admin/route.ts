import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password, slug, isSuperAdmin } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { restaurant: true }
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (isSuperAdmin && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Not authorized as SuperAdmin" }, { status: 403 });
    }

    if (!isSuperAdmin && user.role !== "SUPER_ADMIN") {
      if (!slug || user.restaurant?.slug !== slug) {
         return NextResponse.json({ error: "Invalid restaurant code" }, { status: 401 });
      }
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Must be an admin/manager role or SuperAdmin
    if (!["OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Access denied. Admin portal only." }, { status: 403 });
    }

    const token = await signToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId,
      branchId: user.branchId,
    });

    const response = NextResponse.json({ 
      success: true, 
      user: { name: user.name, role: user.role } 
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
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
