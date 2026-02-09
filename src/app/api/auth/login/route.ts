import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (
    username === process.env.AUTH_USERNAME &&
    password === process.env.AUTH_PASSWORD
  ) {
    const response = NextResponse.json({ success: true });
    response.cookies.set("auth-token", "authenticated", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return response;
  }

  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}
