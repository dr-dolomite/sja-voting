"use server";

import { db } from "@/lib/db";
import { getVoterSession, VOTER_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logVoterAction, logSystemEvent } from "@/lib/logger";

/** Fetch the active election with positions filtered by the voter's grade level. */
export async function getActiveBallot(voterId: string) {
  // Look up the voter's grade level via their section
  const voter = await db.voter.findUnique({
    where: { id: voterId },
    include: { section: true },
  });

  const voterGradeLevel = voter?.section?.gradeLevel ?? null;

  const election = await db.election.findFirst({
    where: { isActive: true },
    include: {
      positions: {
        orderBy: { order: "asc" },
        include: {
          candidates: {
            include: { partylist: true },
            orderBy: { fullName: "asc" },
          },
        },
      },
    },
  });

  if (!election) return null;

  // Check voter assignment: if election has assigned voters, verify this voter is assigned
  const assignedCount = await db.election.findUnique({
    where: { id: election.id },
    select: { _count: { select: { voters: true } } },
  });

  if (assignedCount && assignedCount._count.voters > 0) {
    const isAssigned = await db.election.findFirst({
      where: {
        id: election.id,
        voters: { some: { id: voterId } },
      },
    });
    if (!isAssigned) return null;
  }

  // Filter positions: show universal positions (empty gradeLevels) and
  // positions whose gradeLevels include the voter's grade level
  const filteredPositions = election.positions.filter(
    (p) =>
      p.gradeLevels.length === 0 ||
      (voterGradeLevel && p.gradeLevels.includes(voterGradeLevel)),
  );

  return { ...election, positions: filteredPositions };
}

/** Submit votes for all positions at once. */
export async function submitVotes(candidateIds: string[]) {
  const session = await getVoterSession();
  if (!session) {
    await logSystemEvent({
      action: "VOTE_REJECTED_NO_SESSION",
      category: "VOTE",
      severity: "ERROR",
      detail: "Vote attempt with no voter session",
    });
    return { error: "Not authenticated." };
  }

  // Re-check voter status
  const voter = await db.voter.findUnique({
    where: { id: session.voterId },
  });

  if (!voter) return { error: "Voter not found." };

  if (voter.hasVoted) {
    await logVoterAction({
      action: "VOTE_REJECTED_ALREADY_VOTED",
      category: "VOTE",
      severity: "ERROR",
      actorId: voter.id,
      actorName: voter.lrn,
      detail: `Double-vote attempt by LRN "${voter.lrn}"`,
    });
    return { error: "You have already voted." };
  }

  // Verify active election exists
  const election = await db.election.findFirst({
    where: { isActive: true },
    include: {
      positions: {
        include: { candidates: true },
      },
    },
  });

  if (!election) {
    await logVoterAction({
      action: "VOTE_REJECTED_NO_ELECTION",
      category: "VOTE",
      severity: "ERROR",
      actorId: voter.id,
      actorName: voter.lrn,
      detail: `Vote rejected for LRN "${voter.lrn}" — no active election`,
    });
    return { error: "No active election." };
  }

  // Check voter assignment: if election has assigned voters, verify this voter is assigned
  const assignedCount = await db.election.findUnique({
    where: { id: election.id },
    select: { _count: { select: { voters: true } } },
  });

  if (assignedCount && assignedCount._count.voters > 0) {
    const isAssigned = await db.election.findFirst({
      where: {
        id: election.id,
        voters: { some: { id: voter.id } },
      },
    });
    if (!isAssigned) {
      await logVoterAction({
        action: "VOTE_REJECTED_NOT_ASSIGNED",
        category: "VOTE",
        severity: "ERROR",
        actorId: voter.id,
        actorName: voter.lrn,
        detail: `Vote rejected for LRN "${voter.lrn}" — not assigned to election "${election.name}"`,
      });
      return { error: "You are not eligible for this election." };
    }
  }

  // Validate candidate IDs belong to this election
  const validCandidateIds = new Set(
    election.positions.flatMap((p) => p.candidates.map((c) => c.id)),
  );

  for (const id of candidateIds) {
    if (!validCandidateIds.has(id)) {
      await logVoterAction({
        action: "VOTE_REJECTED_INVALID_CANDIDATES",
        category: "VOTE",
        severity: "ERROR",
        actorId: voter.id,
        actorName: voter.lrn,
        detail: `Vote rejected for LRN "${voter.lrn}" — invalid candidate ID`,
        metadata: { invalidId: id, submittedIds: candidateIds },
      });
      return { error: "Invalid candidate selection." };
    }
  }

  // Validate maxVotes per position
  for (const position of election.positions) {
    const selectedForPosition = candidateIds.filter((id) =>
      position.candidates.some((c) => c.id === id),
    );
    if (selectedForPosition.length > position.maxVotes) {
      await logVoterAction({
        action: "VOTE_REJECTED_MAX_EXCEEDED",
        category: "VOTE",
        severity: "ERROR",
        actorId: voter.id,
        actorName: voter.lrn,
        targetType: "Position",
        targetId: position.id,
        targetName: position.name,
        detail: `Vote rejected for LRN "${voter.lrn}" — too many selections for "${position.name}" (${selectedForPosition.length}/${position.maxVotes})`,
        metadata: {
          selected: selectedForPosition.length,
          max: position.maxVotes,
        },
      });
      return {
        error: `Too many selections for ${position.name}. Max: ${position.maxVotes}.`,
      };
    }
  }

  // Create votes + mark voter in a transaction
  await db.$transaction([
    ...candidateIds.map((candidateId) =>
      db.vote.create({
        data: { voterId: session.voterId, candidateId },
      }),
    ),
    db.voter.update({
      where: { id: session.voterId },
      data: { hasVoted: true, votedAt: new Date() },
    }),
  ]);

  await logVoterAction({
    action: "VOTE_SUBMITTED",
    category: "VOTE",
    actorId: voter.id,
    actorName: voter.lrn,
    targetType: "Election",
    targetId: election.id,
    targetName: election.name,
    detail: `LRN "${voter.lrn}" cast ${candidateIds.length} vote(s) in "${election.name}"`,
    metadata: {
      candidateIds,
      positionBreakdown: election.positions.map((p) => ({
        positionId: p.id,
        positionName: p.name,
        selected: candidateIds.filter((id) =>
          p.candidates.some((c) => c.id === id),
        ).length,
      })),
    },
  });

  // Clear voter session after voting
  const cookieStore = await cookies();
  cookieStore.delete(VOTER_COOKIE);

  redirect("/vote/success");
}
