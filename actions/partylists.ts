"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

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

  await db.partylist.create({ data: { name, color } });
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

  await db.partylist.update({ where: { id }, data: { name, color } });
  revalidatePath("/dashboard/partylists");
  return { success: true };
}

export async function deletePartylist(id: string) {
  try {
    await db.partylist.delete({ where: { id } });
    revalidatePath("/dashboard/partylists");
    return { success: true };
  } catch {
    return { error: "Failed to delete partylist. It may have candidates assigned." };
  }
}
