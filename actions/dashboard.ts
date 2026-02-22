"use server";

import { db } from "@/lib/db";
import type { ActorType, LogCategory, LogSeverity } from "@/lib/generated/prisma";

export type RecentLog = {
  id: string;
  timestamp: Date;
  actorType: ActorType;
  actorName: string | null;
  action: string;
  category: LogCategory;
  severity: LogSeverity;
  targetName: string | null;
  detail: string | null;
};

export type DashboardStats = {
  totalVoters: number;
  totalVoted: number;
  totalSections: number;
  totalCandidates: number;
  totalPartylists: number;
  activeElection: { id: string; name: string } | null;
  totalElections: number;
  errorsToday: number;
  warningsToday: number;
  recentLogs: RecentLog[];
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  const [
    totalVoters,
    totalVoted,
    totalSections,
    totalCandidates,
    totalPartylists,
    activeElection,
    totalElections,
    errorsToday,
    warningsToday,
    recentLogs,
  ] = await Promise.all([
    db.voter.count(),
    db.voter.count({ where: { hasVoted: true } }),
    db.section.count(),
    db.candidate.count(),
    db.partylist.count(),
    db.election.findFirst({
      where: { isActive: true },
      select: { id: true, name: true },
    }),
    db.election.count(),
    db.auditLog.count({
      where: { severity: "ERROR", timestamp: { gte: startOfDay } },
    }),
    db.auditLog.count({
      where: { severity: "WARNING", timestamp: { gte: startOfDay } },
    }),
    db.auditLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 8,
      select: {
        id: true,
        timestamp: true,
        actorType: true,
        actorName: true,
        action: true,
        category: true,
        severity: true,
        targetName: true,
        detail: true,
      },
    }),
  ]);

  return {
    totalVoters,
    totalVoted,
    totalSections,
    totalCandidates,
    totalPartylists,
    activeElection,
    totalElections,
    errorsToday,
    warningsToday,
    recentLogs,
  };
}
