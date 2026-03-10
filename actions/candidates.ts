"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/logger";
import { unlink } from "fs/promises";
import { join } from "path";

async function deleteLocalImage(imageUrl: string | null | undefined) {
  if (!imageUrl?.startsWith("/uploads/candidates/")) return;
  try {
    await unlink(join(process.cwd(), "public", imageUrl));
  } catch {
    // File already gone — ignore
  }
}

// ─── Queries ────────────────────────────────────────────────────

export async function getCandidates() {
  return db.candidate.findMany({
    include: {
      position: { include: { election: true } },
      partylist: true,
      _count: { select: { votes: true } },
    },
    orderBy: [
      { position: { election: { name: "asc" } } },
      { position: { order: "asc" } },
      { fullName: "asc" },
    ],
  });
}

/** Positions grouped under their election, for selection dropdowns. */
export async function getPositionsWithElections() {
  return db.election.findMany({
    include: {
      positions: { orderBy: { order: "asc" } },
    },
    orderBy: { name: "asc" },
  });
}

// ─── CRUD ───────────────────────────────────────────────────────

export async function createCandidate(formData: FormData) {
  const fullName = (formData.get("fullName") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const imageUrl = (formData.get("imageUrl") as string)?.trim() || null;
  const positionId = formData.get("positionId") as string;
  const partylistId = formData.get("partylistId") as string;

  if (!fullName) return { error: "Full name is required." };
  if (!positionId) return { error: "Position is required." };
  if (!partylistId) return { error: "Partylist is required." };

  const candidate = await db.candidate.create({
    data: { fullName, description, imageUrl, positionId, partylistId },
    include: { position: { include: { election: true } }, partylist: true },
  });

  const session = await getSession();
  await logAdminAction({
    action: "CANDIDATE_CREATED",
    category: "CANDIDATE",
    actorId: session?.adminId,
    actorName: session?.username,
    targetType: "Candidate",
    targetId: candidate.id,
    targetName: fullName,
    detail: `Created candidate "${fullName}" for "${candidate.position.name}" (${candidate.partylist.name})`,
    metadata: { positionId, positionName: candidate.position.name, partylistId, partylistName: candidate.partylist.name, electionName: candidate.position.election.name },
  });

  revalidatePath("/dashboard/candidates");
  return { success: true };
}

export async function updateCandidate(formData: FormData) {
  const id = formData.get("id") as string;
  const fullName = (formData.get("fullName") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const imageUrl = (formData.get("imageUrl") as string)?.trim() || null;
  const positionId = formData.get("positionId") as string;
  const partylistId = formData.get("partylistId") as string;

  if (!fullName) return { error: "Full name is required." };
  if (!positionId) return { error: "Position is required." };
  if (!partylistId) return { error: "Partylist is required." };

  const existing = await db.candidate.findUnique({ where: { id } });

  // If the image is being replaced, delete the old local file
  if (existing?.imageUrl !== imageUrl) {
    await deleteLocalImage(existing?.imageUrl);
  }

  await db.candidate.update({
    where: { id },
    data: { fullName, description, imageUrl, positionId, partylistId },
  });

  const session = await getSession();
  await logAdminAction({
    action: "CANDIDATE_UPDATED",
    category: "CANDIDATE",
    actorId: session?.adminId,
    actorName: session?.username,
    targetType: "Candidate",
    targetId: id,
    targetName: fullName,
    detail: `Updated candidate "${existing?.fullName}" → "${fullName}"`,
    metadata: { oldFullName: existing?.fullName, newFullName: fullName, positionId, partylistId },
  });

  revalidatePath("/dashboard/candidates");
  return { success: true };
}

export async function deleteCandidates(ids: string[]) {
  if (!ids.length) return { error: "No candidates selected." };

  const candidates = await db.candidate.findMany({
    where: { id: { in: ids } },
    include: { position: true },
  });

  try {
    await db.candidate.deleteMany({ where: { id: { in: ids } } });
    await Promise.all(candidates.map((c) => deleteLocalImage(c.imageUrl)));

    const session = await getSession();
    await logAdminAction({
      action: "CANDIDATES_BULK_DELETED",
      category: "CANDIDATE",
      severity: "WARNING",
      actorId: session?.adminId,
      actorName: session?.username,
      detail: `Bulk deleted ${candidates.length} candidate(s): ${candidates.map((c) => c.fullName).join(", ")}`,
      metadata: {
        ids,
        names: candidates.map((c) => c.fullName),
      },
    });

    revalidatePath("/dashboard/candidates");
    return { success: true };
  } catch {
    return { error: "Failed to delete candidates." };
  }
}

export async function deleteCandidate(id: string) {
  const candidate = await db.candidate.findUnique({
    where: { id },
    include: { position: true },
  });
  try {
    await db.candidate.delete({ where: { id } });
    await deleteLocalImage(candidate?.imageUrl);

    const session = await getSession();
    await logAdminAction({
      action: "CANDIDATE_DELETED",
      category: "CANDIDATE",
      severity: "WARNING",
      actorId: session?.adminId,
      actorName: session?.username,
      targetType: "Candidate",
      targetId: id,
      targetName: candidate?.fullName,
      detail: `Deleted candidate "${candidate?.fullName}" from position "${candidate?.position.name}"`,
    });

    revalidatePath("/dashboard/candidates");
    return { success: true };
  } catch {
    return { error: "Failed to delete candidate." };
  }
}
