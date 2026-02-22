"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/logger";

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
  const admin = await db.admin.create({ data: { username, password: hashed } });

  const session = await getSession();
  await logAdminAction({
    action: "ADMIN_CREATED",
    category: "ADMIN_MGMT",
    actorId: session?.adminId,
    actorName: session?.username,
    targetType: "Admin",
    targetId: admin.id,
    targetName: username,
    detail: `Created admin account "${username}"`,
  });

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

  const old = await db.admin.findUnique({ where: { id } });
  await db.admin.update({ where: { id }, data: { username } });

  const session = await getSession();
  await logAdminAction({
    action: "ADMIN_UPDATED",
    category: "ADMIN_MGMT",
    actorId: session?.adminId,
    actorName: session?.username,
    targetType: "Admin",
    targetId: id,
    targetName: username,
    detail: `Updated admin username "${old?.username}" → "${username}"`,
    metadata: { oldUsername: old?.username, newUsername: username },
  });

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

  const target = await db.admin.findUnique({ where: { id } });
  const session = await getSession();
  await logAdminAction({
    action: "ADMIN_PASSWORD_CHANGED",
    category: "ADMIN_MGMT",
    severity: "WARNING",
    actorId: session?.adminId,
    actorName: session?.username,
    targetType: "Admin",
    targetId: id,
    targetName: target?.username,
    detail: `Changed password for admin "${target?.username}"`,
  });

  revalidatePath("/dashboard/admins");
  return { success: true };
}

export async function deleteAdmin(id: string) {
  // Prevent deleting yourself
  const session = await getSession();
  if (session?.adminId === id) {
    await logAdminAction({
      action: "ADMIN_DELETE_SELF_REJECTED",
      category: "ADMIN_MGMT",
      severity: "WARNING",
      actorId: session.adminId,
      actorName: session.username,
      detail: `Admin "${session.username}" attempted to delete their own account`,
    });
    return { error: "You cannot delete your own account." };
  }

  // Prevent deleting the last admin
  const count = await db.admin.count();
  if (count <= 1) {
    await logAdminAction({
      action: "ADMIN_DELETE_LAST_REJECTED",
      category: "ADMIN_MGMT",
      severity: "WARNING",
      actorId: session?.adminId,
      actorName: session?.username,
      detail: `Attempted to delete the last admin account`,
    });
    return { error: "Cannot delete the last admin account." };
  }

  const target = await db.admin.findUnique({ where: { id } });
  try {
    await db.admin.delete({ where: { id } });

    await logAdminAction({
      action: "ADMIN_DELETED",
      category: "ADMIN_MGMT",
      severity: "WARNING",
      actorId: session?.adminId,
      actorName: session?.username,
      targetType: "Admin",
      targetId: id,
      targetName: target?.username,
      detail: `Deleted admin account "${target?.username}"`,
    });

    revalidatePath("/dashboard/admins");
    return { success: true };
  } catch {
    return { error: "Failed to delete admin." };
  }
}
