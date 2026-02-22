import Link from "next/link";
import {
  Users,
  Trophy,
  Flag,
  BarChart3,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  Activity,
  Upload,
  UserCog,
  ShieldHalfIcon,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDashboardStats, type RecentLog } from "@/actions/dashboard";

function formatAction(action: string) {
  return action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(date: Date) {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const severityConfig = {
  INFO: {
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    icon: Activity,
  },
  WARNING: {
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    icon: AlertTriangle,
  },
  ERROR: {
    color: "text-red-500",
    bg: "bg-red-500/10",
    icon: ShieldAlert,
  },
} as const;

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Overview of your voting system
        </p>
      </div>

      {/* Active Election Banner */}
      {stats.activeElection ? (
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
            </span>
            <div>
              <p className="text-sm font-semibold">
                Active Election: {stats.activeElection.name}
              </p>
              <p className="text-xs text-muted-foreground">
                Voting is currently in progress
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/results">
              View Results <ArrowRight className="ml-1.5 size-3.5" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-4 text-amber-500" />
            <div>
              <p className="text-sm font-semibold">No Active Election</p>
              <p className="text-xs text-muted-foreground">
                Activate an election to start accepting votes
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/elections">
              Manage Elections <ArrowRight className="ml-1.5 size-3.5" />
            </Link>
          </Button>
        </div>
      )}

      {/* Hero Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Voter Pool */}
        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute top-0 right-0 -mt-2 -mr-4 size-24 rounded-full bg-blue-500/5" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription className="text-sm font-semibold uppercase tracking-wider">
                Voters
              </CardDescription>
              <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 -mr-2">
                <Users className="size-4 text-blue-500" />
              </div>
            </div>
            <CardTitle className="text-5xl font-bold tabular-nums">
              {stats.totalVoters}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.activeElection ? (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{stats.totalVoted} voted</span>
                  <span>
                    {stats.totalVoters > 0
                      ? Math.round((stats.totalVoted / stats.totalVoters) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-500"
                    style={{
                      width: `${stats.totalVoters > 0 ? Math.max((stats.totalVoted / stats.totalVoters) * 100, 1) : 0}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Across {stats.totalSections} section
                {stats.totalSections !== 1 ? "s" : ""}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Candidates */}
        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute top-0 right-0 -mt-2 -mr-4 size-24 rounded-full bg-purple-500/5" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-sm font-semibold uppercase tracking-wider">
                Candidates
              </CardDescription>
              <div className="flex size-9 -mr-2 items-center justify-center rounded-lg bg-purple-500/10">
                <Trophy className="size-4 text-purple-500" />
              </div>
            </div>
            <CardTitle className="text-5xl font-bold tabular-nums">
              {stats.totalCandidates}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Running for office</p>
          </CardContent>
        </Card>

        {/* Partylists */}
        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute top-0 right-0 -mt-2 -mr-4 size-24 rounded-full bg-amber-500/5" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-sm font-semibold uppercase tracking-wider">
                Partylists
              </CardDescription>
              <div className="flex size-9 -mr-2 items-center justify-center rounded-lg bg-amber-500/10">
                <Flag className="size-4 text-amber-500" />
              </div>
            </div>
            <CardTitle className="text-5xl font-bold tabular-nums">
              {stats.totalPartylists}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Registered groups</p>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div
            className={`absolute top-0 right-0 -mt-2 -mr-4 size-24 rounded-full ${stats.errorsToday > 0 ? "bg-red-500/5" : "bg-emerald-500/5"}`}
          />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-sm font-semibold uppercase tracking-wider">
                System Health
              </CardDescription>
              <div
                className={`flex size-9 -mr-2 items-center justify-center rounded-lg ${
                  stats.errorsToday > 0 ? "bg-red-500/10" : "bg-emerald-500/10"
                }`}
              >
                {stats.errorsToday > 0 ? (
                  <ShieldAlert className="size-4 text-red-500" />
                ) : (
                  <CheckCircle2 className="size-4 text-emerald-500" />
                )}
              </div>
            </div>
            <CardTitle className="text-5xl font-bold tabular-nums">
              {stats.errorsToday > 0 ? stats.errorsToday : "OK"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats.errorsToday > 0
                ? `${stats.errorsToday} error${stats.errorsToday !== 1 ? "s" : ""}, ${stats.warningsToday} warning${stats.warningsToday !== 1 ? "s" : ""} today`
                : stats.warningsToday > 0
                  ? `${stats.warningsToday} warning${stats.warningsToday !== 1 ? "s" : ""} today`
                  : "No issues today"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-4">
            <Button
              variant="outline"
              className="h-auto justify-start gap-3 px-4 py-3"
              asChild
            >
              {/* View positions */}
              <Link
                href={
                  stats.activeElection
                    ? `/dashboard/elections/${stats.activeElection.id}`
                    : "/dashboard/elections"
                }
              >
                <div className="flex size-8 items-center justify-center rounded-md bg-amber-500/10">
                  <ShieldHalfIcon className="size-4 text-amber-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Manage Positions</p>
                  <p className="text-xs text-muted-foreground">
                    View and edit election positions
                  </p>
                </div>
              </Link>
            </Button>

            <Button
              variant="outline"
              className="h-auto justify-start gap-3 px-4 py-3"
              asChild
            >
              <Link href="/dashboard/voters">
                <div className="flex size-8 items-center justify-center rounded-md bg-blue-500/10">
                  <Upload className="size-4 text-blue-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Import Voters</p>
                  <p className="text-xs text-muted-foreground">
                    Upload voter list
                  </p>
                </div>
              </Link>
            </Button>
            <Button
              variant="outline"
              className="h-auto justify-start gap-3 px-4 py-3"
              asChild
            >
              <Link href="/dashboard/candidates">
                <div className="flex size-8 items-center justify-center rounded-md bg-purple-500/10">
                  <UserCog className="size-4 text-purple-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Add Candidate</p>
                  <p className="text-xs text-muted-foreground">
                    Register a new candidate
                  </p>
                </div>
              </Link>
            </Button>

            <Button
              variant="outline"
              className="h-auto justify-start gap-3 px-4 py-3"
              asChild
            >
              <Link href="/dashboard/results">
                <div className="flex size-8 items-center justify-center rounded-md bg-emerald-500/10">
                  <BarChart3 className="size-4 text-emerald-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">View Results</p>
                  <p className="text-xs text-muted-foreground">
                    Live election results
                  </p>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Feed */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Recent Activity
              </CardTitle>
              <CardDescription className="text-xs">
                Latest system events
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-xs" asChild>
              <Link href="/dashboard/logs">
                View All <ArrowRight className="ml-1 size-3" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {stats.recentLogs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No activity recorded yet.
            </p>
          ) : (
            <div className="space-y-1">
              {stats.recentLogs.map((log) => (
                <ActivityRow key={log.id} log={log} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityRow({ log }: { log: RecentLog }) {
  const config = severityConfig[log.severity] ?? severityConfig.INFO;
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-muted/50">
      <div
        className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md ${config.bg}`}
      >
        <Icon className={`size-3.5 ${config.color}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium">
            {formatAction(log.action)}
          </p>
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {timeAgo(log.timestamp)}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {log.actorName ?? log.actorType}
          {log.targetName ? ` \u2192 ${log.targetName}` : ""}
          {log.detail && !log.targetName ? ` \u2014 ${log.detail}` : ""}
        </p>
      </div>
    </div>
  );
}
