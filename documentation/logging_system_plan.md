# Logging System Plan — SJA Voting

## Overview

A comprehensive, database-backed audit logging system that gives admins full visibility into every significant action in the voting system. Logs are stored in PostgreSQL via Prisma and viewable through a dedicated dashboard page.

---

## 1. Database Schema

### New Model: `AuditLog`

```prisma
model AuditLog {
  id        String   @id @default(cuid())
  timestamp DateTime @default(now())

  // Who performed the action
  actorType ActorType            // ADMIN, VOTER, SYSTEM
  actorId   String?              // Admin ID or Voter ID (null for SYSTEM)
  actorName String?              // Username or LRN for display (denormalized for permanence)

  // What happened
  action    String               // e.g. "ADMIN_LOGIN", "VOTE_SUBMITTED", "ELECTION_CREATED"
  category  LogCategory          // AUTH, VOTE, ELECTION, POSITION, CANDIDATE, PARTYLIST, VOTER, ADMIN, SYSTEM
  severity  LogSeverity          // INFO, WARNING, ERROR

  // Context
  targetType  String?            // e.g. "Election", "Candidate", "Voter"
  targetId    String?            // ID of the affected entity
  targetName  String?            // Human-readable name of the target (denormalized)

  // Details
  detail    String?              // Human-readable summary, e.g. "Created election 'Student Council 2026'"
  metadata  Json?                // Structured payload — before/after values, request details, etc.

  // Request context
  ipAddress String?              // Client IP if available
}

enum ActorType {
  ADMIN
  VOTER
  SYSTEM
}

enum LogCategory {
  AUTH
  VOTE
  ELECTION
  POSITION
  CANDIDATE
  PARTYLIST
  VOTER_MGMT
  ADMIN_MGMT
  SYSTEM
}

enum LogSeverity {
  INFO
  WARNING
  ERROR
}
```

### Why denormalize `actorName` / `targetName`?

Audit logs must remain meaningful even after the referenced entities are deleted. If an admin or voter is removed, the log still shows who did what.

---

## 2. Logging Utility — `lib/logger.ts`

A single helper module that all server actions call.

```ts
// lib/logger.ts
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { getSession, getVoterSession } from "@/lib/auth";

interface LogParams {
  action: string;
  category: LogCategory;
  severity?: LogSeverity;       // defaults to INFO
  actorType: ActorType;
  actorId?: string | null;
  actorName?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  targetName?: string | null;
  detail?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function auditLog(params: LogParams): Promise<void> {
  // Extract IP from request headers (best-effort)
  const ipAddress = await getClientIp();

  await db.auditLog.create({
    data: {
      ...params,
      severity: params.severity ?? "INFO",
      ipAddress,
    },
  });
}

// Convenience wrappers:
export async function logAdminAction(params: Omit<LogParams, "actorType">) { ... }
export async function logVoterAction(params: Omit<LogParams, "actorType">) { ... }
export async function logSystemEvent(params: Omit<LogParams, "actorType" | "actorId" | "actorName">) { ... }
```

Key design decisions:
- **Fire-and-forget safe**: Logging failures should never break the main operation. Wrap in try/catch internally.
- **Non-blocking**: Use `void` return; callers don't `await` unless they need to guarantee write order.
- **IP extraction**: Read from `x-forwarded-for` or `x-real-ip` headers (common behind reverse proxies).

---

## 3. What Gets Logged

### 3.1 Authentication Events

| Action Constant | Trigger | Severity | Details Captured |
|---|---|---|---|
| `ADMIN_LOGIN_SUCCESS` | Admin logs in | INFO | username |
| `ADMIN_LOGIN_FAILED` | Bad credentials | WARNING | attempted username |
| `ADMIN_LOGOUT` | Admin logs out | INFO | username |
| `VOTER_LOGIN_SUCCESS` | Voter logs in by LRN | INFO | LRN, section |
| `VOTER_LOGIN_FAILED` | LRN not found | WARNING | attempted LRN |
| `VOTER_LOGIN_ALREADY_VOTED` | Voter already voted | WARNING | LRN |
| `VOTER_LOGIN_NO_ELECTION` | No active election | WARNING | LRN |
| `VOTER_LOGOUT` | Voter logs out | INFO | LRN |

### 3.2 Voting Events

| Action Constant | Trigger | Severity | Details Captured |
|---|---|---|---|
| `VOTE_SUBMITTED` | Votes cast successfully | INFO | voterId, LRN, # of votes, candidate IDs, position breakdown |
| `VOTE_REJECTED_ALREADY_VOTED` | Double-vote attempt | ERROR | voterId, LRN |
| `VOTE_REJECTED_NO_ELECTION` | No active election | ERROR | voterId |
| `VOTE_REJECTED_INVALID_CANDIDATES` | Invalid candidate IDs | ERROR | voterId, invalid IDs |
| `VOTE_REJECTED_MAX_EXCEEDED` | Too many picks per position | ERROR | voterId, position, count vs max |

### 3.3 Election Management

| Action Constant | Trigger | Severity | Details Captured |
|---|---|---|---|
| `ELECTION_CREATED` | New election | INFO | name |
| `ELECTION_UPDATED` | Name changed | INFO | old name → new name |
| `ELECTION_ACTIVATED` | Election toggled on | INFO | name, previously active election (if any) |
| `ELECTION_DEACTIVATED` | Election toggled off | INFO | name |
| `ELECTION_DELETED` | Election removed | WARNING | name |

### 3.4 Position Management

| Action Constant | Trigger | Severity | Details Captured |
|---|---|---|---|
| `POSITION_CREATED` | New position | INFO | name, election, order, maxVotes |
| `POSITION_UPDATED` | Position edited | INFO | changed fields (before/after) |
| `POSITION_DELETED` | Position removed | WARNING | name, election |

### 3.5 Candidate Management

| Action Constant | Trigger | Severity | Details Captured |
|---|---|---|---|
| `CANDIDATE_CREATED` | New candidate | INFO | fullName, position, partylist |
| `CANDIDATE_UPDATED` | Candidate edited | INFO | changed fields |
| `CANDIDATE_DELETED` | Candidate removed | WARNING | fullName, position |

### 3.6 Partylist Management

| Action Constant | Trigger | Severity | Details Captured |
|---|---|---|---|
| `PARTYLIST_CREATED` | New partylist | INFO | name, color |
| `PARTYLIST_UPDATED` | Partylist edited | INFO | old/new name, color |
| `PARTYLIST_DELETED` | Partylist removed | WARNING | name |

### 3.7 Voter Management

| Action Constant | Trigger | Severity | Details Captured |
|---|---|---|---|
| `VOTER_CREATED` | Single voter added | INFO | LRN, section |
| `VOTER_UPDATED` | Voter edited | INFO | changed fields |
| `VOTER_DELETED` | Voter removed | WARNING | LRN, section |
| `VOTERS_ALL_DELETED` | "Delete all" action | ERROR | total count deleted |
| `VOTERS_IMPORTED` | Bulk import | INFO | total imported, skipped count, skipped LRNs |

### 3.8 Admin Management

| Action Constant | Trigger | Severity | Details Captured |
|---|---|---|---|
| `ADMIN_CREATED` | New admin account | INFO | username |
| `ADMIN_UPDATED` | Username changed | INFO | old → new username |
| `ADMIN_PASSWORD_CHANGED` | Password reset | WARNING | username (NOT the password) |
| `ADMIN_DELETED` | Admin removed | WARNING | username of deleted admin, who deleted |
| `ADMIN_DELETE_SELF_REJECTED` | Tried to delete self | WARNING | username |
| `ADMIN_DELETE_LAST_REJECTED` | Tried to delete last admin | WARNING | username |

---

## 4. Dashboard UI — Audit Log Viewer

### New route: `/dashboard/logs`

#### Features

1. **Filterable data table** with columns:
   - Timestamp
   - Actor (icon badge for ADMIN/VOTER/SYSTEM + name)
   - Action (human-readable)
   - Category (color-coded badge)
   - Severity (color-coded: green/yellow/red)
   - Target
   - Detail
   - IP Address

2. **Filters** (in a toolbar above the table):
   - **Category** — dropdown multi-select (AUTH, VOTE, ELECTION, etc.)
   - **Severity** — dropdown multi-select (INFO, WARNING, ERROR)
   - **Actor type** — ADMIN / VOTER / SYSTEM
   - **Date range** — from/to date pickers
   - **Search** — free-text search on `detail`, `actorName`, `targetName`

3. **Detail drawer/dialog**: Click a row to see the full `metadata` JSON rendered as a formatted key-value list.

4. **Pagination**: Server-side with 50 rows per page (cursor-based for performance).

5. **Export**: "Download CSV" button that exports filtered results.

6. **Real-time indicator**: Optional — show a badge count of new ERROR-level logs on the sidebar nav item.

### File Structure

```
app/dashboard/logs/
  page.tsx                     — Server component: fetch logs, render LogViewer
components/dashboard/logs/
  audit-log-table.tsx          — Client component: table with sorting/filtering
  audit-log-filters.tsx        — Filter toolbar
  audit-log-detail-dialog.tsx  — Detail view for metadata
  log-severity-badge.tsx       — Colored severity badge
  log-category-badge.tsx       — Colored category badge
```

### Sidebar Addition

Add a "Logs" entry to the dashboard sidebar with a `ScrollText` (lucide) icon, placed at the bottom of the nav.

---

## 5. Server Action for Fetching Logs

### `actions/logs.ts`

```ts
"use server";

export async function getAuditLogs(filters: {
  page?: number;
  pageSize?: number;          // default 50
  categories?: LogCategory[];
  severities?: LogSeverity[];
  actorType?: ActorType;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}): Promise<{ logs: AuditLog[]; total: number; page: number; pageSize: number }> {
  // Build Prisma `where` dynamically from filters
  // Use skip/take pagination
  // Order by timestamp DESC
}

export async function getLogStats(): Promise<{
  totalLogs: number;
  errorsToday: number;
  warningsToday: number;
  recentActivity: { category: string; count: number }[];
}> {
  // Aggregation queries for a summary card at the top of the logs page
}
```

---

## 6. Implementation Order

### Phase 1 — Foundation
1. Add `AuditLog` model + enums to `schema.prisma`
2. Run `prisma migrate dev`
3. Create `lib/logger.ts` with `auditLog()` + convenience wrappers

### Phase 2 — Instrument Server Actions
4. Add logging calls to `actions/auth.ts` (admin login/logout)
5. Add logging calls to `actions/voter-auth.ts` (voter login/logout)
6. Add logging calls to `actions/vote.ts` (submit votes — success + all rejection paths)
7. Add logging calls to `actions/elections.ts` (CRUD + toggle)
8. Add logging calls to `actions/positions.ts` (CRUD)
9. Add logging calls to `actions/candidates.ts` (CRUD)
10. Add logging calls to `actions/partylists.ts` (CRUD)
11. Add logging calls to `actions/voters.ts` (CRUD + import + delete all)
12. Add logging calls to `actions/admins.ts` (CRUD + password change)

### Phase 3 — Dashboard UI
13. Create `actions/logs.ts` (fetch + filter + stats)
14. Build the logs page and components
15. Add sidebar nav entry
16. Add severity badge counts to sidebar (optional)

### Phase 4 — Polish
17. Add CSV export functionality
18. Add metadata detail dialog
19. Add log retention/cleanup job (optional — via cron or manual "purge logs older than X" action)

---

## 7. Example: Instrumented `submitVotes`

```ts
export async function submitVotes(candidateIds: string[]) {
  const voterSession = await getVoterSession();
  if (!voterSession) {
    await auditLog({
      action: "VOTE_REJECTED_NO_SESSION",
      category: "VOTE",
      severity: "ERROR",
      actorType: "SYSTEM",
      detail: "Vote attempt with no voter session",
    });
    return { error: "Not authenticated" };
  }

  const voter = await db.voter.findUnique({ where: { id: voterSession.voterId } });
  if (voter?.hasVoted) {
    await auditLog({
      action: "VOTE_REJECTED_ALREADY_VOTED",
      category: "VOTE",
      severity: "ERROR",
      actorType: "VOTER",
      actorId: voter.id,
      actorName: voter.lrn,
      detail: `Double-vote attempt by LRN ${voter.lrn}`,
    });
    return { error: "Already voted" };
  }

  // ... validation ...

  // On success (inside the transaction callback):
  await auditLog({
    action: "VOTE_SUBMITTED",
    category: "VOTE",
    severity: "INFO",
    actorType: "VOTER",
    actorId: voter.id,
    actorName: voter.lrn,
    targetType: "Election",
    targetId: election.id,
    targetName: election.name,
    detail: `LRN ${voter.lrn} cast ${candidateIds.length} vote(s)`,
    metadata: {
      candidateIds,
      positionBreakdown: /* ... */,
    },
  });
}
```

---

## 8. Design Principles

| Principle | Rationale |
|---|---|
| **Denormalize display names** | Logs remain readable even after entity deletion |
| **Never log sensitive data** | No passwords, no tokens — only IDs, usernames, LRNs |
| **Fail silently** | A logging failure must never break the primary operation |
| **Structured metadata** | `Json` field allows flexible, queryable payloads without schema changes |
| **Server-side filtering** | Keep the client fast; paginate and filter in Prisma queries |
| **Severity levels** | INFO for normal ops, WARNING for noteworthy events (deletes, password changes), ERROR for rejected/failed operations |
| **Immutable logs** | No update/delete endpoints for audit logs (admins can only read) |

---

## 9. Estimated Effort

| Phase | Scope | Estimate |
|---|---|---|
| Phase 1 — Foundation | Schema + logger utility | ~30 min |
| Phase 2 — Instrumentation | All 10 action files (~40 log points) | ~2 hours |
| Phase 3 — Dashboard UI | Table, filters, pagination, stats | ~2-3 hours |
| Phase 4 — Polish | CSV export, detail dialog, retention | ~1 hour |
| **Total** | | **~5-6 hours** |

---

## 10. Future Considerations

- **Log retention policy**: Auto-delete logs older than N days to keep the table manageable.
- **Real-time streaming**: Use Server-Sent Events or polling to live-update the log table.
- **Alerting**: Email or UI notification when ERROR-level logs spike (e.g., multiple double-vote attempts).
- **Log export scheduling**: Periodic automated CSV/JSON export for archival.
- **Request tracing**: Add a `requestId` field to correlate multiple log entries from a single request.
