"use server";

import { db } from "@/lib/db";
import type { LogCategory, LogSeverity, ActorType } from "@/lib/generated/prisma";

export type AuditLogEntry = {
  id: string;
  timestamp: Date;
  actorType: ActorType;
  actorId: string | null;
  actorName: string | null;
  action: string;
  category: LogCategory;
  severity: LogSeverity;
  targetType: string | null;
  targetId: string | null;
  targetName: string | null;
  detail: string | null;
  metadata: unknown;
  ipAddress: string | null;
};

export type LogFilters = {
  page?: number;
  pageSize?: number;
  categories?: LogCategory[];
  severities?: LogSeverity[];
  actorType?: ActorType;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

export async function getAuditLogs(filters: LogFilters = {}): Promise<{
  logs: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const skip = (page - 1) * pageSize;

  // Build dynamic where clause
  const where: Record<string, unknown> = {};

  if (filters.categories && filters.categories.length > 0) {
    where.category = { in: filters.categories };
  }

  if (filters.severities && filters.severities.length > 0) {
    where.severity = { in: filters.severities };
  }

  if (filters.actorType) {
    where.actorType = filters.actorType;
  }

  if (filters.search) {
    where.OR = [
      { detail: { contains: filters.search, mode: "insensitive" } },
      { actorName: { contains: filters.search, mode: "insensitive" } },
      { targetName: { contains: filters.search, mode: "insensitive" } },
      { action: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters.dateFrom || filters.dateTo) {
    const timestampFilter: Record<string, Date> = {};
    if (filters.dateFrom) timestampFilter.gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      timestampFilter.lte = to;
    }
    where.timestamp = timestampFilter;
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip,
      take: pageSize,
    }),
    db.auditLog.count({ where }),
  ]);

  return { logs, total, page, pageSize };
}

export async function getLogStats() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [totalLogs, errorsToday, warningsToday] = await Promise.all([
    db.auditLog.count(),
    db.auditLog.count({
      where: { severity: "ERROR", timestamp: { gte: startOfDay } },
    }),
    db.auditLog.count({
      where: { severity: "WARNING", timestamp: { gte: startOfDay } },
    }),
  ]);

  return { totalLogs, errorsToday, warningsToday };
}

export async function getAuditLogsForExport(filters: LogFilters = {}): Promise<AuditLogEntry[]> {
  const where: Record<string, unknown> = {};

  if (filters.categories && filters.categories.length > 0) {
    where.category = { in: filters.categories };
  }
  if (filters.severities && filters.severities.length > 0) {
    where.severity = { in: filters.severities };
  }
  if (filters.actorType) {
    where.actorType = filters.actorType;
  }
  if (filters.search) {
    where.OR = [
      { detail: { contains: filters.search, mode: "insensitive" } },
      { actorName: { contains: filters.search, mode: "insensitive" } },
      { targetName: { contains: filters.search, mode: "insensitive" } },
      { action: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters.dateFrom || filters.dateTo) {
    const timestampFilter: Record<string, Date> = {};
    if (filters.dateFrom) timestampFilter.gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      timestampFilter.lte = to;
    }
    where.timestamp = timestampFilter;
  }

  return db.auditLog.findMany({
    where,
    orderBy: { timestamp: "desc" },
    take: 10000, // Safety cap
  });
}
