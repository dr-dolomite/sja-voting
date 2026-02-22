"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getPositions(electionId: string) {
  return db.position.findMany({
    where: { electionId },
    include: {
      _count: { select: { candidates: true } },
    },
    orderBy: { order: "asc" },
  });
}

export async function createPosition(formData: FormData) {
  const electionId = formData.get("electionId") as string;
  const name = (formData.get("name") as string)?.trim();
  const order = parseInt(formData.get("order") as string, 10);
  const maxVotes = parseInt(formData.get("maxVotes") as string, 10) || 1;

  if (!name) {
    return { error: "Position name is required." };
  }

  if (isNaN(order) || order < 1) {
    return { error: "Display order must be a positive number." };
  }

  await db.position.create({
    data: { name, order, maxVotes, electionId },
  });

  revalidatePath(`/dashboard/elections/${electionId}`);
  return { success: true };
}

export async function updatePosition(formData: FormData) {
  const id = formData.get("id") as string;
  const electionId = formData.get("electionId") as string;
  const name = (formData.get("name") as string)?.trim();
  const order = parseInt(formData.get("order") as string, 10);
  const maxVotes = parseInt(formData.get("maxVotes") as string, 10) || 1;

  if (!name) {
    return { error: "Position name is required." };
  }

  if (isNaN(order) || order < 1) {
    return { error: "Display order must be a positive number." };
  }

  await db.position.update({
    where: { id },
    data: { name, order, maxVotes },
  });

  revalidatePath(`/dashboard/elections/${electionId}`);
  return { success: true };
}

export async function deletePosition(id: string, electionId: string) {
  try {
    await db.position.delete({ where: { id } });
    revalidatePath(`/dashboard/elections/${electionId}`);
    return { success: true };
  } catch {
    return { error: "Failed to delete position." };
  }
}
