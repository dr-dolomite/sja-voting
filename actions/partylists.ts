"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/logger";

export async function getPartylists() {
  return db.partylist.findMany({
    include: {
      _count: { select: { candidates: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function createPartylist(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const color = (formData.get("color") as string)?.trim() || null;

  if (!name) {
    return { error: "Partylist name is required." };
  }

  const existing = await db.partylist.findUnique({ where: { name } });
  if (existing) {
    return { error: "A partylist with this name already exists." };
  }

  const partylist = await db.partylist.create({ data: { name, color } });

  const session = await getSession();
  await logAdminAction({
    action: "PARTYLIST_CREATED",
    category: "PARTYLIST",
    actorId: session?.adminId,
    actorName: session?.username,
    targetType: "Partylist",
    targetId: partylist.id,
    targetName: name,
    detail: `Created partylist "${name}"`,
    metadata: { color },
  });

  revalidatePath("/dashboard/partylists");
  return { success: true };
}

export async function updatePartylist(formData: FormData) {
  const id = formData.get("id") as string;
  const name = (formData.get("name") as string)?.trim();
  const color = (formData.get("color") as string)?.trim() || null;

  if (!name) {
    return { error: "Partylist name is required." };
  }

  // Check uniqueness (exclude self)
  const existing = await db.partylist.findFirst({
    where: { name, id: { not: id } },
  });
  if (existing) {
    return { error: "A partylist with this name already exists." };
  }

  const old = await db.partylist.findUnique({ where: { id } });
  await db.partylist.update({ where: { id }, data: { name, color } });

  const session = await getSession();
  await logAdminAction({
    action: "PARTYLIST_UPDATED",
    category: "PARTYLIST",
    actorId: session?.adminId,
    actorName: session?.username,
    targetType: "Partylist",
    targetId: id,
    targetName: name,
    detail: `Updated partylist "${old?.name}" → "${name}"`,
    metadata: { oldName: old?.name, newName: name, oldColor: old?.color, newColor: color },
  });

  revalidatePath("/dashboard/partylists");
  return { success: true };
}

export async function deletePartylist(id: string) {
  const partylist = await db.partylist.findUnique({ where: { id } });
  try {
    await db.partylist.delete({ where: { id } });

    const session = await getSession();
    await logAdminAction({
      action: "PARTYLIST_DELETED",
      category: "PARTYLIST",
      severity: "WARNING",
      actorId: session?.adminId,
      actorName: session?.username,
      targetType: "Partylist",
      targetId: id,
      targetName: partylist?.name,
      detail: `Deleted partylist "${partylist?.name}"`,
    });

    revalidatePath("/dashboard/partylists");
    return { success: true };
  } catch {
    return { error: "Failed to delete partylist. It may have candidates assigned." };
  }
}
