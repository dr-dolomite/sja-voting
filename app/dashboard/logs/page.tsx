import { getAuditLogs, getLogStats } from "@/actions/logs";
import { AuditLogTable } from "@/components/dashboard/logs/audit-log-table";

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const page = typeof params.page === "string" ? parseInt(params.page, 10) : 1;
  const search = typeof params.search === "string" ? params.search : undefined;
  const category = typeof params.category === "string" ? params.category : undefined;
  const severity = typeof params.severity === "string" ? params.severity : undefined;
  const actorType = typeof params.actorType === "string" ? params.actorType : undefined;
  const dateFrom = typeof params.dateFrom === "string" ? params.dateFrom : undefined;
  const dateTo = typeof params.dateTo === "string" ? params.dateTo : undefined;

  const categories = category ? category.split(",") as never[] : undefined;
  const severities = severity ? severity.split(",") as never[] : undefined;

  const [{ logs, total, pageSize }, stats] = await Promise.all([
    getAuditLogs({
      page,
      search,
      categories,
      severities,
      actorType: actorType as never,
      dateFrom,
      dateTo,
    }),
    getLogStats(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Audit Logs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          View all system activity and events.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total Logs</p>
          <p className="text-2xl font-bold">{stats.totalLogs.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Errors Today</p>
          <p className="text-2xl font-bold text-red-600">{stats.errorsToday}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Warnings Today</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.warningsToday}</p>
        </div>
      </div>

      <AuditLogTable
        logs={logs}
        total={total}
        page={page}
        pageSize={pageSize}
        filters={{ search, category, severity, actorType, dateFrom, dateTo }}
      />
    </div>
  );
}
