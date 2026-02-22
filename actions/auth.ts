"use server";

import { db } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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
    return { error: "Invalid username or password." };
  }

  const valid = await compare(password, admin.password);

  if (!valid) {
    return { error: "Invalid username or password." };
  }

  const token = await signToken({
    adminId: admin.id,
    username: admin.username,
  });

  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  redirect("/login");
}
