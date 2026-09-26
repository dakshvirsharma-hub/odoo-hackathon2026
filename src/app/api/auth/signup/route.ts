import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  loginId: z
    .string()
    .min(6, "Login ID must be at least 6 characters")
    .max(12, "Login ID must be at most 12 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Login ID can only contain letters, numbers, and underscores"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["STAFF", "MANAGER"]).default("STAFF"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter")
    .regex(/[a-z]/, "Password must contain at least 1 lowercase letter")
    .regex(/[0-9]/, "Password must contain at least 1 number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least 1 special character"),
});

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = signupSchema.parse(body);

    // Check if loginId or email already exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { loginId: validated.loginId },
          { email: validated.email.toLowerCase() },
        ],
      },
    });

    if (existing) {
      if (existing.loginId === validated.loginId) {
        return NextResponse.json(
          { success: false, error: "Login ID is already taken" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, error: "Email is already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(validated.password, 10);
    const newUser = await prisma.user.create({
      data: {
        name: validated.name,
        loginId: validated.loginId,
        email: validated.email.toLowerCase(),
        passwordHash,
        role: validated.role,
      },
    });

    const safeUser = {
      id: newUser.id,
      name: newUser.name,
      loginId: newUser.loginId,
      email: newUser.email,
      role: newUser.role,
    };

    const res = NextResponse.json(
      {
        success: true,
        message: "User registered successfully",
        user: safeUser,
      },
      { status: 201 }
    );

    res.cookies.set("stocksense_session", JSON.stringify(safeUser), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
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
