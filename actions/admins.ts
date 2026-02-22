"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";

// ─── Queries ────────────────────────────────────────────────────

export async function getAdmins() {
  return db.admin.findMany({
    select: { id: true, username: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

// ─── CRUD ───────────────────────────────────────────────────────

export async function createAdmin(formData: FormData) {
  const username = (formData.get("username") as string)?.trim();
  const password = (formData.get("password") as string) ?? "";

  if (!username) return { error: "Username is required." };
  if (password.length < 6)
    return { error: "Password must be at least 6 characters." };

  const existing = await db.admin.findUnique({ where: { username } });
  if (existing) return { error: "An admin with this username already exists." };

  const hashed = await hash(password, 10);
  await db.admin.create({ data: { username, password: hashed } });

  revalidatePath("/dashboard/admins");
  return { success: true };
}

export async function updateAdmin(formData: FormData) {
  const id = formData.get("id") as string;
  const username = (formData.get("username") as string)?.trim();

  if (!username) return { error: "Username is required." };

  // Check uniqueness (exclude self)
  const existing = await db.admin.findFirst({
    where: { username, id: { not: id } },
  });
  if (existing) return { error: "An admin with this username already exists." };

  await db.admin.update({ where: { id }, data: { username } });

  revalidatePath("/dashboard/admins");
  return { success: true };
}

export async function changeAdminPassword(formData: FormData) {
  const id = formData.get("id") as string;
  const password = (formData.get("password") as string) ?? "";

  if (password.length < 6)
    return { error: "Password must be at least 6 characters." };

  const hashed = await hash(password, 10);
  await db.admin.update({ where: { id }, data: { password: hashed } });

  revalidatePath("/dashboard/admins");
  return { success: true };
}

export async function deleteAdmin(id: string) {
  // Prevent deleting yourself
  const session = await getSession();
  if (session?.adminId === id) {
    return { error: "You cannot delete your own account." };
  }

  // Prevent deleting the last admin
  const count = await db.admin.count();
  if (count <= 1) {
    return { error: "Cannot delete the last admin account." };
  }

  try {
    await db.admin.delete({ where: { id } });
    revalidatePath("/dashboard/admins");
    return { success: true };
  } catch {
    return { error: "Failed to delete admin." };
  }
}
