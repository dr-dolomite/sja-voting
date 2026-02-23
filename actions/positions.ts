"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/logger";

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
  const gradeLevelRaw = (formData.get("gradeLevel") as string)?.trim();
  const gradeLevel =
    gradeLevelRaw && gradeLevelRaw.toLowerCase() !== "all"
      ? gradeLevelRaw
      : null;

  if (!name) {
    return { error: "Position name is required." };
  }

  if (isNaN(order) || order < 1) {
    return { error: "Display order must be a positive number." };
  }

  const position = await db.position.create({
    data: { name, order, maxVotes, gradeLevel, electionId },
  });

  const session = await getSession();
  const election = await db.election.findUnique({ where: { id: electionId } });
  await logAdminAction({
    action: "POSITION_CREATED",
    category: "POSITION",
    actorId: session?.adminId,
    actorName: session?.username,
    targetType: "Position",
    targetId: position.id,
    targetName: name,
    detail: `Created position "${name}" in election "${election?.name}"`,
    metadata: { electionId, order, maxVotes },
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
  const gradeLevelRaw = (formData.get("gradeLevel") as string)?.trim();
  const gradeLevel =
    gradeLevelRaw && gradeLevelRaw.toLowerCase() !== "all"
      ? gradeLevelRaw
      : null;

  if (!name) {
    return { error: "Position name is required." };
  }

  if (isNaN(order) || order < 1) {
    return { error: "Display order must be a positive number." };
  }

  const existing = await db.position.findUnique({ where: { id } });
  await db.position.update({
    where: { id },
    data: { name, order, maxVotes, gradeLevel },
  });

  const session = await getSession();
  await logAdminAction({
    action: "POSITION_UPDATED",
    category: "POSITION",
    actorId: session?.adminId,
    actorName: session?.username,
    targetType: "Position",
    targetId: id,
    targetName: name,
    detail: `Updated position "${existing?.name}" → "${name}"`,
    metadata: {
      oldName: existing?.name,
      newName: name,
      oldOrder: existing?.order,
      newOrder: order,
      oldMaxVotes: existing?.maxVotes,
      newMaxVotes: maxVotes,
    },
  });

  revalidatePath(`/dashboard/elections/${electionId}`);
  return { success: true };
}

export async function deletePosition(id: string, electionId: string) {
  const position = await db.position.findUnique({ where: { id } });
  try {
    await db.position.delete({ where: { id } });

    const session = await getSession();
    const election = await db.election.findUnique({
      where: { id: electionId },
    });
    await logAdminAction({
      action: "POSITION_DELETED",
      category: "POSITION",
      severity: "WARNING",
      actorId: session?.adminId,
      actorName: session?.username,
      targetType: "Position",
      targetId: id,
      targetName: position?.name,
      detail: `Deleted position "${position?.name}" from election "${election?.name}"`,
    });

    revalidatePath(`/dashboard/elections/${electionId}`);
    return { success: true };
  } catch {
    return { error: "Failed to delete position." };
  }
}
