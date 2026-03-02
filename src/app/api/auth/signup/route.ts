import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signSession, buildSetCookieHeader } from "@/lib/session";

const SIGNUP_PIN = process.env.SIGNUP_PIN ?? "981241";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
      pin?: string;
    };

    const username = body.username?.trim().toLowerCase();
    const password = body.password?.trim();
    const pin = body.pin?.trim();

    if (!username || !password || !pin) {
      return NextResponse.json(
        { success: false, error: "username, password and pin are required." },
        { status: 400 },
      );
    }

    // Validate invite PIN
    if (pin !== SIGNUP_PIN) {
      return NextResponse.json(
        { success: false, error: "Invalid invite PIN." },
        { status: 403 },
      );
    }

    if (username.length < 3 || username.length > 32) {
      return NextResponse.json(
        { success: false, error: "Username must be 3–32 characters." },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters." },
        { status: 400 },
      );
    }

    // Check for duplicate username
    const existing = await prisma.adminUser.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Username already taken." },
        { status: 409 },
      );
    }

    const passwordHash = hashPassword(password);
    const user = await prisma.adminUser.create({
      data: { username, passwordHash },
    });

    // Automatically log the new user in
    const token = signSession({ userId: user.id, username: user.username });

    return NextResponse.json(
      { success: true, username: user.username },
      {
        status: 201,
        headers: { "Set-Cookie": buildSetCookieHeader(token) },
      },
    );
  } catch (err) {
    console.error("[auth/signup]", err);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 },
    );
  }
}
