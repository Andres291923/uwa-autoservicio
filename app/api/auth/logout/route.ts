import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  const cookies = [
    "admin_session",
    "admin_user_id",
    "admin_permissions",
    "admin_is_owner",
  ];

  for (const cookie of cookies) {
    response.cookies.set(cookie, "", {
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}

export async function GET() {
  const response = NextResponse.redirect(new URL("/login", "http://localhost:3000"));

  const cookies = [
    "admin_session",
    "admin_user_id",
    "admin_permissions",
    "admin_is_owner",
  ];

  for (const cookie of cookies) {
    response.cookies.set(cookie, "", {
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}
