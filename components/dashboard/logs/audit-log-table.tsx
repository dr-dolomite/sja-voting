"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  Shield,
  User,
  Monitor,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { getAuditLogsForExport } from "@/actions/logs";
import type { AuditLogEntry } from "@/actions/logs";

// ─── Constants ──────────────────────────────────────────────────

const CATEGORIES = [
  "AUTH",
  "VOTE",
  "ELECTION",
  "POSITION",
  "CANDIDATE",
  "PARTYLIST",
  "VOTER_MGMT",
  "ADMIN_MGMT",
  "SYSTEM",
] as const;

const SEVERITIES = ["INFO", "WARNING", "ERROR"] as const;
const ACTOR_TYPES = ["ADMIN", "VOTER", "SYSTEM"] as const;

// ─── Helpers ────────────────────────────────────────────────────

function severityColor(severity: string) {
  switch (severity) {
    case "ERROR":
      return "destructive";
    case "WARNING":
      return "outline";
    default:
      return "secondary";
  }
}

function severityTextClass(severity: string) {
  switch (severity) {
    case "ERROR":
      return "";
    case "WARNING":
      return "border-yellow-500 text-yellow-700 dark:text-yellow-400";
    default:
      return "";
  }
}

function categoryColor(category: string) {
  const colors: Record<string, string> = {
    AUTH: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    VOTE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    ELECTION: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    POSITION: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    CANDIDATE: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    PARTYLIST: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
    VOTER_MGMT: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
    ADMIN_MGMT: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    SYSTEM: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  };
  return colors[category] ?? "";
}

function actorIcon(actorType: string) {
  switch (actorType) {
    case "ADMIN":
      return <Shield className="size-3.5" />;
    case "VOTER":
      return <User className="size-3.5" />;
    default:
      return <Monitor className="size-3.5" />;
  }
}

function formatTimestamp(date: Date) {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

// ─── Component ──────────────────────────────────────────────────

export function AuditLogTable({
  logs,
  total,
  page,
  pageSize,
  filters,
}: {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  filters: {
    search?: string;
    category?: string;
    severity?: string;
    actorType?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [detailLog, setDetailLog] = useState<AuditLogEntry | null>(null);
  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const [exporting, setExporting] = useState(false);

  const totalPages = Math.ceil(total / pageSize);

  // Build URL with updated params
  const buildUrl = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      // Reset to page 1 when filters change (unless we're explicitly setting page)
      if (!("page" in updates)) {
        params.delete("page");
      }
      return `/dashboard/logs?${params.toString()}`;
    },
    [searchParams],
  );

  function handleSearch() {
    router.push(buildUrl({ search: searchInput || undefined }));
  }

  async function handleExport() {
    setExporting(true);
    try {
      const data = await getAuditLogsForExport({
        categories: filters.category?.split(",") as never[],
        severities: filters.severity?.split(",") as never[],
        actorType: filters.actorType as never,
        search: filters.search,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      });

      const csvHeader =
        "Timestamp,Severity,Category,Actor Type,Actor,Action,Target,Detail,IP Address";
      const csvRows = data.map((log) =>
        [
          new Date(log.timestamp).toISOString(),
          log.severity,
          log.category,
          log.actorType,
          log.actorName ?? "",
          log.action,
          log.targetName ?? "",
          `"${(log.detail ?? "").replace(/"/g, '""')}"`,
          log.ipAddress ?? "",
        ].join(","),
      );

      const csv = [csvHeader, ...csvRows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const hasFilters =
    filters.search ||
    filters.category ||
    filters.severity ||
    filters.actorType ||
    filters.dateFrom ||
    filters.dateTo;

  return (
    <>
      {/* Filters toolbar */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-1 items-center gap-2 min-w-50">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              className="pl-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleSearch}>
            Search
          </Button>
        </div>

        <Select
          value={filters.category ?? "all"}
          onValueChange={(v) =>
            router.push(buildUrl({ category: v === "all" ? undefined : v }))
          }
        >
          <SelectTrigger className="w-37.5">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.severity ?? "all"}
          onValueChange={(v) =>
            router.push(buildUrl({ severity: v === "all" ? undefined : v }))
          }
        >
          <SelectTrigger className="w-32.5">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            {SEVERITIES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.actorType ?? "all"}
          onValueChange={(v) =>
            router.push(buildUrl({ actorType: v === "all" ? undefined : v }))
          }
        >
          <SelectTrigger className="w-32.5">
            <SelectValue placeholder="Actor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actors</SelectItem>
            {ACTOR_TYPES.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="w-35"
            value={filters.dateFrom ?? ""}
            onChange={(e) =>
              router.push(buildUrl({ dateFrom: e.target.value || undefined }))
            }
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            className="w-35"
            value={filters.dateTo ?? ""}
            onChange={(e) =>
              router.push(buildUrl({ dateTo: e.target.value || undefined }))
            }
          />
        </div>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/logs")}
          >
            <X className="size-4 mr-1" />
            Clear
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting}
        >
          <Download className="size-4 mr-1" />
          {exporting ? "Exporting..." : "CSV"}
        </Button>
      </div>

      {/* Results summary */}
      <div className="text-sm text-muted-foreground">
        {total.toLocaleString()} log{total !== 1 ? "s" : ""} found
        {totalPages > 1 && ` · Page ${page} of ${totalPages}`}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-35">Time</TableHead>
              <TableHead className="w-20">Severity</TableHead>
              <TableHead className="w-27.5">Category</TableHead>
              <TableHead className="w-35">Actor</TableHead>
              <TableHead>Detail</TableHead>
              <TableHead className="w-15" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No logs found.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(log.timestamp)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={severityColor(log.severity) as "destructive" | "outline" | "secondary"}
                      className={severityTextClass(log.severity)}
                    >
                      {log.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${categoryColor(log.category)}`}
                    >
                      {log.category.replace("_", " ")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {actorIcon(log.actorType)}
                      <span className="text-sm truncate max-w-27.5">
                        {log.actorName ?? log.actorType}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-75">
                    <p className="text-sm truncate">{log.detail ?? log.action}</p>
                    {log.targetName && (
                      <p className="text-xs text-muted-foreground truncate">
                        Target: {log.targetName}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => setDetailLog(log)}
                    >
                      <Eye className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, total)} of {total.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => router.push(buildUrl({ page: String(page - 1) }))}
            >
              <ChevronLeft className="size-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => router.push(buildUrl({ page: String(page + 1) }))}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detailLog} onOpenChange={() => setDetailLog(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Detail</DialogTitle>
          </DialogHeader>
          {detailLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Timestamp</p>
                  <p className="font-medium">
                    {new Date(detailLog.timestamp).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Severity</p>
                  <Badge
                    variant={severityColor(detailLog.severity) as "destructive" | "outline" | "secondary"}
                    className={severityTextClass(detailLog.severity)}
                  >
                    {detailLog.severity}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${categoryColor(detailLog.category)}`}
                  >
                    {detailLog.category}
                  </span>
                </div>
                <div>
                  <p className="text-muted-foreground">Action</p>
                  <p className="font-mono text-xs">{detailLog.action}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Actor</p>
                  <div className="flex items-center gap-1.5">
                    {actorIcon(detailLog.actorType)}
                    <span>{detailLog.actorName ?? detailLog.actorType}</span>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">IP Address</p>
                  <p className="font-mono text-xs">
                    {detailLog.ipAddress ?? "—"}
                  </p>
                </div>
                {detailLog.targetType && (
                  <div>
                    <p className="text-muted-foreground">Target</p>
                    <p>
                      {detailLog.targetType}: {detailLog.targetName ?? detailLog.targetId}
                    </p>
                  </div>
                )}
              </div>

              {detailLog.detail && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Detail</p>
                  <p className="text-sm bg-muted rounded-md p-3">
                    {detailLog.detail}
                  </p>
                </div>
              )}

              {detailLog.metadata != null && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Metadata</p>
                  <pre className="text-xs bg-muted rounded-md p-3 overflow-auto max-h-50">
                    {JSON.stringify(detailLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              <div className="text-xs text-muted-foreground pt-2 border-t">
                Log ID: {detailLog.id}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
