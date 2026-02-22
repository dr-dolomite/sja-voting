"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getElections() {
  return db.election.findMany({
    include: {
      _count: { select: { positions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getElection(id: string) {
  return db.election.findUnique({
    where: { id },
    include: {
      positions: {
        orderBy: { order: "asc" },
        include: {
          _count: { select: { candidates: true } },
        },
      },
    },
  });
}

export async function createElection(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();

  if (!name) {
    return { error: "Election name is required." };
  }

  await db.election.create({ data: { name } });
  revalidatePath("/dashboard/elections");
  return { success: true };
}

export async function updateElection(formData: FormData) {
  const id = formData.get("id") as string;
  const name = (formData.get("name") as string)?.trim();

  if (!name) {
    return { error: "Election name is required." };
  }

  await db.election.update({ where: { id }, data: { name } });
  revalidatePath("/dashboard/elections");
  return { success: true };
}

export async function toggleElection(id: string) {
  const election = await db.election.findUnique({ where: { id } });
  if (!election) return { error: "Election not found." };

  if (!election.isActive) {
    // Deactivate all others first, then activate this one
    await db.$transaction([
      db.election.updateMany({ data: { isActive: false } }),
      db.election.update({ where: { id }, data: { isActive: true } }),
    ]);
  } else {
    // Just deactivate this one
    await db.election.update({ where: { id }, data: { isActive: false } });
  }

  revalidatePath("/dashboard/elections");
  return { success: true };
}

export async function deleteElection(id: string) {
  try {
    await db.election.delete({ where: { id } });
    revalidatePath("/dashboard/elections");
    return { success: true };
  } catch {
    return { error: "Failed to delete election." };
  }
}
