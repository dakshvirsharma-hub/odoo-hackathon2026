import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  identifier: z.string().min(1, "Login ID or Email is required"),
  password: z.string().min(1, "Password is required"),
});

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = loginSchema.parse(body);

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { loginId: validated.identifier },
          { email: validated.identifier.toLowerCase() },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials. User not found." },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(validated.password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials. Incorrect password." },
        { status: 401 }
      );
    }

    // Return safe user object (exclude passwordHash)
    const safeUser = {
      id: user.id,
      name: user.name,
      loginId: user.loginId,
      email: user.email,
      role: user.role,
    };

    const res = NextResponse.json({
      success: true,
      message: "Login successful",
      user: safeUser,
    });

    // Set cookie for SSR/middleware compatibility
    res.cookies.set("stocksense_session", JSON.stringify(safeUser), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
