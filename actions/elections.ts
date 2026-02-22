"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/logger";

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

  const election = await db.election.create({ data: { name } });

  const session = await getSession();
  await logAdminAction({
    action: "ELECTION_CREATED",
    category: "ELECTION",
    actorId: session?.adminId,
    actorName: session?.username,
    targetType: "Election",
    targetId: election.id,
    targetName: name,
    detail: `Created election "${name}"`,
  });

  revalidatePath("/dashboard/elections");
  return { success: true };
}

export async function updateElection(formData: FormData) {
  const id = formData.get("id") as string;
  const name = (formData.get("name") as string)?.trim();

  if (!name) {
    return { error: "Election name is required." };
  }

  const existing = await db.election.findUnique({ where: { id } });
  await db.election.update({ where: { id }, data: { name } });

  const session = await getSession();
  await logAdminAction({
    action: "ELECTION_UPDATED",
    category: "ELECTION",
    actorId: session?.adminId,
    actorName: session?.username,
    targetType: "Election",
    targetId: id,
    targetName: name,
    detail: `Updated election "${existing?.name}" → "${name}"`,
    metadata: { oldName: existing?.name, newName: name },
  });

  revalidatePath("/dashboard/elections");
  return { success: true };
}

export async function toggleElection(id: string) {
  const election = await db.election.findUnique({ where: { id } });
  if (!election) return { error: "Election not found." };

  const session = await getSession();

  if (!election.isActive) {
    // Deactivate all others first, then activate this one
    await db.$transaction([
      db.election.updateMany({ data: { isActive: false } }),
      db.election.update({ where: { id }, data: { isActive: true } }),
    ]);
    await logAdminAction({
      action: "ELECTION_ACTIVATED",
      category: "ELECTION",
      actorId: session?.adminId,
      actorName: session?.username,
      targetType: "Election",
      targetId: id,
      targetName: election.name,
      detail: `Activated election "${election.name}"`,
    });
  } else {
    // Just deactivate this one
    await db.election.update({ where: { id }, data: { isActive: false } });
    await logAdminAction({
      action: "ELECTION_DEACTIVATED",
      category: "ELECTION",
      actorId: session?.adminId,
      actorName: session?.username,
      targetType: "Election",
      targetId: id,
      targetName: election.name,
      detail: `Deactivated election "${election.name}"`,
    });
  }

  revalidatePath("/dashboard/elections");
  return { success: true };
}

export async function deleteElection(id: string) {
  const election = await db.election.findUnique({ where: { id } });
  try {
    await db.election.delete({ where: { id } });

    const session = await getSession();
    await logAdminAction({
      action: "ELECTION_DELETED",
      category: "ELECTION",
      severity: "WARNING",
      actorId: session?.adminId,
      actorName: session?.username,
      targetType: "Election",
      targetId: id,
      targetName: election?.name,
      detail: `Deleted election "${election?.name}"`,
    });

    revalidatePath("/dashboard/elections");
    return { success: true };
  } catch {
    return { error: "Failed to delete election." };
  }
}
