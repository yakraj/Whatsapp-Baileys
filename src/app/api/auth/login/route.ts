import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signSession, buildSetCookieHeader } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };

    const username = body.username?.trim().toLowerCase();
    const password = body.password?.trim();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "username and password are required." },
        { status: 400 },
      );
    }

    const user = await prisma.adminUser.findUnique({ where: { username } });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      // Generic message to avoid username enumeration
      return NextResponse.json(
        { success: false, error: "Invalid username or password." },
        { status: 401 },
      );
    }

    const token = signSession({ userId: user.id, username: user.username });

    return NextResponse.json(
      { success: true, username: user.username },
      {
        status: 200,
        headers: { "Set-Cookie": buildSetCookieHeader(token) },
      },
    );
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 },
    );
  }
}
