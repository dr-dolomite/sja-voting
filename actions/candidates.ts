"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

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

  await db.candidate.create({
    data: { fullName, description, imageUrl, positionId, partylistId },
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

  await db.candidate.update({
    where: { id },
    data: { fullName, description, imageUrl, positionId, partylistId },
  });

  revalidatePath("/dashboard/candidates");
  return { success: true };
}

export async function deleteCandidate(id: string) {
  try {
    await db.candidate.delete({ where: { id } });
    revalidatePath("/dashboard/candidates");
    return { success: true };
  } catch {
    return { error: "Failed to delete candidate." };
  }
}
