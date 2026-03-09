"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/logger";
import { compare } from "bcryptjs";

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

export async function resetElectionVotes(
  electionId: string,
  password: string,
) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated." };

  const admin = await db.admin.findUnique({
    where: { id: session.adminId },
  });
  if (!admin) return { error: "Admin not found." };

  const valid = await compare(password, admin.password);
  if (!valid) {
    await logAdminAction({
      action: "ELECTION_RESET_REJECTED",
      category: "ELECTION",
      severity: "WARNING",
      actorId: session.adminId,
      actorName: session.username,
      targetType: "Election",
      targetId: electionId,
      detail: "Vote reset rejected — wrong password",
    });
    return { error: "Invalid password." };
  }

  const election = await db.election.findUnique({
    where: { id: electionId },
    include: {
      positions: { include: { candidates: { select: { id: true } } } },
    },
  });
  if (!election) return { error: "Election not found." };

  const candidateIds = election.positions.flatMap((p) =>
    p.candidates.map((c) => c.id),
  );

  const affectedVotes = await db.vote.findMany({
    where: { candidateId: { in: candidateIds } },
    select: { voterId: true },
  });
  const affectedVoterIds = [
    ...new Set(affectedVotes.map((v) => v.voterId)),
  ];

  await db.$transaction([
    db.vote.deleteMany({ where: { candidateId: { in: candidateIds } } }),
    db.voter.updateMany({
      where: { id: { in: affectedVoterIds } },
      data: { hasVoted: false, votedAt: null },
    }),
  ]);

  await logAdminAction({
    action: "ELECTION_VOTES_RESET",
    category: "ELECTION",
    severity: "ERROR",
    actorId: session.adminId,
    actorName: session.username,
    targetType: "Election",
    targetId: electionId,
    targetName: election.name,
    detail: `Reset all votes for election "${election.name}" (${affectedVoterIds.length} voters, ${affectedVotes.length} votes)`,
    metadata: {
      affectedVoterCount: affectedVoterIds.length,
      deletedVoteCount: affectedVotes.length,
    },
  });

  revalidatePath("/dashboard/elections");
  revalidatePath("/dashboard/results");
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

// ─── Voter Assignment ────────────────────────────────────────────

export async function getElectionVoters(electionId: string) {
  const election = await db.election.findUnique({
    where: { id: electionId },
    include: {
      voters: {
        include: { section: true },
        orderBy: { lrn: "asc" },
      },
    },
  });
  return election?.voters ?? [];
}

export async function getElectionAssignedSections(electionId: string) {
  const election = await db.election.findUnique({
    where: { id: electionId },
    include: {
      voters: {
        select: { sectionId: true },
      },
    },
  });

  if (!election) return [];

  // Get unique section IDs that have ALL their voters assigned
  const assignedSectionIds = new Set(election.voters.map((v) => v.sectionId));

  const sections = await db.section.findMany({
    where: { voters: { some: {} } },
    include: { _count: { select: { voters: true } } },
    orderBy: { name: "asc" },
  });

  const assignedVoterCountBySection = new Map<string, number>();
  for (const v of election.voters) {
    assignedVoterCountBySection.set(
      v.sectionId,
      (assignedVoterCountBySection.get(v.sectionId) ?? 0) + 1,
    );
  }

  return sections.map((s) => ({
    id: s.id,
    name: s.name,
    gradeLevel: s.gradeLevel,
    totalVoters: s._count.voters,
    assignedVoters: assignedVoterCountBySection.get(s.id) ?? 0,
    isFullyAssigned:
      assignedSectionIds.has(s.id) &&
      (assignedVoterCountBySection.get(s.id) ?? 0) === s._count.voters,
  }));
}

export async function assignSectionToElection(
  electionId: string,
  sectionId: string,
) {
  const voters = await db.voter.findMany({
    where: { sectionId },
    select: { id: true },
  });

  await db.election.update({
    where: { id: electionId },
    data: {
      voters: { connect: voters.map((v) => ({ id: v.id })) },
    },
  });

  const section = await db.section.findUnique({ where: { id: sectionId } });
  const session = await getSession();
  await logAdminAction({
    action: "ELECTION_SECTION_ASSIGNED",
    category: "ELECTION",
    actorId: session?.adminId,
    actorName: session?.username,
    targetType: "Election",
    targetId: electionId,
    detail: `Assigned section "${section?.name}" (${voters.length} voters) to election`,
    metadata: { sectionId, sectionName: section?.name, voterCount: voters.length },
  });

  revalidatePath(`/dashboard/elections/${electionId}`);
  return { success: true };
}

export async function unassignSectionFromElection(
  electionId: string,
  sectionId: string,
) {
  const voters = await db.voter.findMany({
    where: { sectionId },
    select: { id: true },
  });

  await db.election.update({
    where: { id: electionId },
    data: {
      voters: { disconnect: voters.map((v) => ({ id: v.id })) },
    },
  });

  const section = await db.section.findUnique({ where: { id: sectionId } });
  const session = await getSession();
  await logAdminAction({
    action: "ELECTION_SECTION_UNASSIGNED",
    category: "ELECTION",
    actorId: session?.adminId,
    actorName: session?.username,
    targetType: "Election",
    targetId: electionId,
    detail: `Unassigned section "${section?.name}" (${voters.length} voters) from election`,
    metadata: { sectionId, sectionName: section?.name, voterCount: voters.length },
  });

  revalidatePath(`/dashboard/elections/${electionId}`);
  return { success: true };
}
