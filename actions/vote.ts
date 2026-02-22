"use server";

import { db } from "@/lib/db";
import { getVoterSession, VOTER_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/** Fetch the active election with positions, candidates, and partylists. */
export async function getActiveBallot() {
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

  return election;
}

/** Submit votes for all positions at once. */
export async function submitVotes(candidateIds: string[]) {
  const session = await getVoterSession();
  if (!session) return { error: "Not authenticated." };

  // Re-check voter status
  const voter = await db.voter.findUnique({
    where: { id: session.voterId },
  });

  if (!voter) return { error: "Voter not found." };
  if (voter.hasVoted) return { error: "You have already voted." };

  // Verify active election exists
  const election = await db.election.findFirst({
    where: { isActive: true },
    include: {
      positions: {
        include: { candidates: true },
      },
    },
  });

  if (!election) return { error: "No active election." };

  // Validate candidate IDs belong to this election
  const validCandidateIds = new Set(
    election.positions.flatMap((p) => p.candidates.map((c) => c.id)),
  );

  for (const id of candidateIds) {
    if (!validCandidateIds.has(id)) {
      return { error: "Invalid candidate selection." };
    }
  }

  // Validate maxVotes per position
  for (const position of election.positions) {
    const selectedForPosition = candidateIds.filter((id) =>
      position.candidates.some((c) => c.id === id),
    );
    if (selectedForPosition.length > position.maxVotes) {
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

  // Clear voter session after voting
  const cookieStore = await cookies();
  cookieStore.delete(VOTER_COOKIE);

  redirect("/vote/success");
}
