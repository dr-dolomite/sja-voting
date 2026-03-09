"use server";

import { Prisma } from "@/lib/generated/prisma";
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
      gradeLevels: position.gradeLevels,
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

/** Get votes and voter-login counts grouped by date for the activity chart. */
export async function getActivityOverTime(electionId: string) {
  // Votes per day scoped to this election
  const voteRows = await db.$queryRaw<{ date: string; count: bigint }[]>(
    Prisma.sql`
      SELECT DATE(v."createdAt") AS date, COUNT(*)::bigint AS count
      FROM "Vote" v
      JOIN "Candidate" c ON v."candidateId" = c."id"
      JOIN "Position" p ON c."positionId" = p."id"
      WHERE p."electionId" = ${electionId}
      GROUP BY DATE(v."createdAt")
      ORDER BY date
    `,
  );

  // Successful voter logins scoped to this election's assigned voters
  // If no voters are assigned, show all voter logins
  const loginRows = await db.$queryRaw<{ date: string; count: bigint }[]>(
    Prisma.sql`
      SELECT DATE("timestamp") AS date, COUNT(*)::bigint AS count
      FROM "AuditLog"
      WHERE "action" = 'VOTER_LOGIN_SUCCESS'
      AND (
        (SELECT COUNT(*) FROM "_ElectionVoters" WHERE "A" = ${electionId}) = 0
        OR "actorId" IN (SELECT "B" FROM "_ElectionVoters" WHERE "A" = ${electionId})
      )
      GROUP BY DATE("timestamp")
      ORDER BY date
    `,
  );

  // Merge both into a single date-keyed map
  const map = new Map<string, { login: number; vote: number }>();

  for (const row of loginRows) {
    const key = new Date(row.date).toISOString().slice(0, 10);
    const entry = map.get(key) ?? { login: 0, vote: 0 };
    entry.login = Number(row.count);
    map.set(key, entry);
  }

  for (const row of voteRows) {
    const key = new Date(row.date).toISOString().slice(0, 10);
    const entry = map.get(key) ?? { login: 0, vote: 0 };
    entry.vote = Number(row.count);
    map.set(key, entry);
  }

  // Return sorted by date
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));
}
