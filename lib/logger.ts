import { db } from "@/lib/db";
import { headers } from "next/headers";
import type {
  ActorType,
  LogCategory,
  LogSeverity,
  Prisma,
} from "@/lib/generated/prisma";

// ─── Types ──────────────────────────────────────────────────────

interface LogParams {
  action: string;
  category: LogCategory;
  severity?: LogSeverity;
  actorType: ActorType;
  actorId?: string | null;
  actorName?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  targetName?: string | null;
  detail?: string | null;
  metadata?: Prisma.InputJsonValue | null;
}

type AdminLogParams = Omit<LogParams, "actorType">;
type VoterLogParams = Omit<LogParams, "actorType">;
type SystemLogParams = Omit<
  LogParams,
  "actorType" | "actorId" | "actorName"
>;

// ─── IP Extraction ──────────────────────────────────────────────

async function getClientIp(): Promise<string | null> {
  try {
    const hdrs = await headers();
    return (
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      hdrs.get("x-real-ip") ??
      null
    );
  } catch {
    return null;
  }
}

// ─── Core Logger ────────────────────────────────────────────────

export async function auditLog(params: LogParams): Promise<void> {
  try {
    const ipAddress = await getClientIp();

    await db.auditLog.create({
      data: {
        action: params.action,
        category: params.category,
        severity: params.severity ?? "INFO",
        actorType: params.actorType,
        actorId: params.actorId ?? null,
        actorName: params.actorName ?? null,
        targetType: params.targetType ?? null,
        targetId: params.targetId ?? null,
        targetName: params.targetName ?? null,
        detail: params.detail ?? null,
        metadata: params.metadata ?? undefined,
        ipAddress,
      },
    });
  } catch (error) {
    // Logging must never break the primary operation
    console.error("[AuditLog] Failed to write log entry:", error);
  }
}

// ─── Convenience Wrappers ───────────────────────────────────────

export async function logAdminAction(params: AdminLogParams): Promise<void> {
  return auditLog({ ...params, actorType: "ADMIN" });
}

export async function logVoterAction(params: VoterLogParams): Promise<void> {
  return auditLog({ ...params, actorType: "VOTER" });
}

export async function logSystemEvent(params: SystemLogParams): Promise<void> {
  return auditLog({
    ...params,
    actorType: "SYSTEM",
    actorId: null,
    actorName: null,
  });
}
