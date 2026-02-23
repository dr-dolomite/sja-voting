"use server";

import { db } from "@/lib/db";
import { signToken, getSession } from "@/lib/auth";
import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logAdminAction } from "@/lib/logger";

export async function loginAction(
  _prevState: { error: string } | null,
  formData: FormData,
) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "Username and password are required." };
  }

  const admin = await db.admin.findUnique({ where: { username } });

  if (!admin) {
    await logAdminAction({
      action: "ADMIN_LOGIN_FAILED",
      category: "AUTH",
      severity: "WARNING",
      actorName: username,
      detail: `Failed login attempt for username "${username}" — user not found`,
    });
    return { error: "Invalid username or password." };
  }

  const valid = await compare(password, admin.password);

  if (!valid) {
    await logAdminAction({
      action: "ADMIN_LOGIN_FAILED",
      category: "AUTH",
      severity: "WARNING",
      actorId: admin.id,
      actorName: admin.username,
      detail: `Failed login attempt for username "${admin.username}" — wrong password`,
    });
    return { error: "Invalid username or password." };
  }

  const token = await signToken({
    adminId: admin.id,
    username: admin.username,
  });

  const cookieStore = await cookies();
  // Clear any active voter session (mutually exclusive logins)
  cookieStore.delete("voter-session");
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1 hour (rolling session extends this in proxy.ts)
  });

  await logAdminAction({
    action: "ADMIN_LOGIN_SUCCESS",
    category: "AUTH",
    actorId: admin.id,
    actorName: admin.username,
    detail: `Admin "${admin.username}" logged in`,
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  const session = await getSession();
  const cookieStore = await cookies();
  cookieStore.delete("session");

  if (session) {
    await logAdminAction({
      action: "ADMIN_LOGOUT",
      category: "AUTH",
      actorId: session.adminId,
      actorName: session.username,
      detail: `Admin "${session.username}" logged out`,
    });
  }

  redirect("/login");
}
