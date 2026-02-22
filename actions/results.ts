"use server";

import { db } from "@/lib/db";

/** Get the currently active election (if any). */
export async function getActiveElection() {
  return db.election.findFirst({
    where: { isActive: true },
    select: { id: true, name: true },
  });
}

/** Get all elections for the dropdown selector. */
export async function getElectionsForResults() {
  return db.election.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, isActive: true },
  });
}

/** Get full results for a specific election. */
export async function getElectionResults(electionId: string) {
  const election = await db.election.findUnique({
    where: { id: electionId },
    include: {
      positions: {
        orderBy: { order: "asc" },
        include: {
          candidates: {
            include: {
              partylist: true,
              _count: { select: { votes: true } },
            },
            orderBy: { fullName: "asc" },
          },
        },
      },
    },
  });

  if (!election) return null;

  // Sort candidates within each position by vote count (descending)
  const positions = election.positions.map((position) => {
    const sortedCandidates = [...position.candidates].sort(
      (a, b) => b._count.votes - a._count.votes,
    );

    const totalVotesForPosition = sortedCandidates.reduce(
      (sum, c) => sum + c._count.votes,
      0,
    );

    return {
      id: position.id,
      name: position.name,
      order: position.order,
      maxVotes: position.maxVotes,
      totalVotes: totalVotesForPosition,
      candidates: sortedCandidates.map((c, index) => ({
        id: c.id,
        fullName: c.fullName,
        imageUrl: c.imageUrl,
        partylist: { name: c.partylist.name, color: c.partylist.color },
        votes: c._count.votes,
        rank: index + 1,
        isWinner: index < position.maxVotes && c._count.votes > 0,
      })),
    };
  });

  return {
    id: election.id,
    name: election.name,
    isActive: election.isActive,
    positions,
  };
}

/** Get per-section voter turnout statistics. */
export async function getSectionTurnout() {
  const sections = await db.section.findMany({
    include: {
      _count: { select: { voters: true } },
      voters: {
        select: { hasVoted: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const sectionStats = sections.map((section) => {
    const totalVoters = section._count.voters;
    const votedCount = section.voters.filter((v) => v.hasVoted).length;
    const turnoutPercent =
      totalVoters > 0 ? Math.round((votedCount / totalVoters) * 100) : 0;

    return {
      id: section.id,
      name: section.name,
      totalVoters,
      votedCount,
      notVotedCount: totalVoters - votedCount,
      turnoutPercent,
    };
  });

  // Overall totals
  const totalVoters = sectionStats.reduce((s, x) => s + x.totalVoters, 0);
  const totalVoted = sectionStats.reduce((s, x) => s + x.votedCount, 0);
  const overallTurnout =
    totalVoters > 0 ? Math.round((totalVoted / totalVoters) * 100) : 0;

  return {
    sections: sectionStats,
    overall: {
      totalVoters,
      totalVoted,
      notVoted: totalVoters - totalVoted,
      turnoutPercent: overallTurnout,
    },
  };
}
