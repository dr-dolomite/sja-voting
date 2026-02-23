"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Users, BarChart3, RefreshCw, Trophy, Crown, Vote } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getElectionResults, getSectionTurnout } from "@/actions/results";

type Election = { id: string; name: string; isActive: boolean };

type CandidateResult = {
  id: string;
  fullName: string;
  imageUrl: string | null;
  partylist: { name: string; color: string | null };
  votes: number;
  rank: number;
  isWinner: boolean;
};

type PositionResult = {
  id: string;
  name: string;
  order: number;
  maxVotes: number;
  totalVotes: number;
  candidates: CandidateResult[];
};

type ElectionResult = {
  id: string;
  name: string;
  isActive: boolean;
  positions: PositionResult[];
};

type TurnoutData = {
  sections: {
    id: string;
    name: string;
    totalVoters: number;
    votedCount: number;
    notVotedCount: number;
    turnoutPercent: number;
  }[];
  overall: {
    totalVoters: number;
    totalVoted: number;
    notVoted: number;
    turnoutPercent: number;
  };
};

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(210, 70%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(30, 80%, 55%)",
];

const GRADIENT_PAIRS = [
  ["#6366f1", "#a78bfa"], // indigo → violet
  ["#3b82f6", "#60a5fa"], // blue → light blue
  ["#8b5cf6", "#c084fc"], // purple → light purple
  ["#ec4899", "#f472b6"], // pink → light pink
  ["#f59e0b", "#fbbf24"], // amber → yellow
  ["#10b981", "#34d399"], // emerald → light emerald
  ["#ef4444", "#f87171"], // red → light red
  ["#06b6d4", "#22d3ee"], // cyan → light cyan
];

function TurnoutRing({
  percent,
  size = 120,
  strokeWidth = 10,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const center = size / 2;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(var(--chart-1))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold tabular-nums">{percent}%</span>
      </div>
    </div>
  );
}

export function ResultsDashboard({
  elections,
}: {
  elections: Election[];
}) {
  const activeElection = elections.find((e) => e.isActive);
  const [selectedId, setSelectedId] = useState(
    activeElection?.id ?? elections[0]?.id ?? "",
  );
  const [results, setResults] = useState<ElectionResult | null>(null);
  const [turnout, setTurnout] = useState<TurnoutData | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  async function handleRefresh() {
    if (!selectedId) return;
    setLoading(true);
    const [electionResults, turnoutData] = await Promise.all([
      getElectionResults(selectedId),
      getSectionTurnout(),
    ]);
    setResults(electionResults);
    setTurnout(turnoutData);
    setLoading(false);
  }

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;

    async function load() {
      const [electionResults, turnoutData] = await Promise.all([
        getElectionResults(selectedId),
        getSectionTurnout(),
      ]);
      if (!cancelled) {
        setResults(electionResults);
        setTurnout(turnoutData);
      }
    }

    load();
    const interval = autoRefresh ? setInterval(load, 10000) : null;
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [selectedId, autoRefresh]);

  if (elections.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Results Summary</h2>
        <p className="text-muted-foreground">
          No elections found. Create an election first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight">
            Results Summary
          </h2>
          {autoRefresh && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card/50 p-1.5 backdrop-blur-sm">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="h-8 w-56 border-0 bg-transparent text-sm shadow-none focus:ring-0">
              <SelectValue placeholder="Select election" />
            </SelectTrigger>
            <SelectContent>
              {elections.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                  {e.isActive ? " (Active)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="h-5 w-px bg-border" />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-xs"
            onClick={() => setAutoRefresh((v) => !v)}
          >
            <RefreshCw
              className={`mr-1.5 size-3.5 ${autoRefresh ? "animate-spin" : ""}`}
              style={autoRefresh ? { animationDuration: "3s" } : undefined}
            />
            {autoRefresh ? "Auto" : "Paused"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-xs"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-1.5 size-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Statistics Cards */}
      {turnout && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Voters */}
          <Card className="relative overflow-hidden border-0 bg-linear-to-br from-card to-card/80 shadow-sm">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 size-24 rounded-full bg-blue-500/5" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-medium uppercase tracking-wider">
                  Total Voters
                </CardDescription>
                <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10">
                  <Users className="size-4 text-blue-500" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold tabular-nums">
                {turnout.overall.totalVoters}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Registered voters
              </p>
            </CardContent>
          </Card>

          {/* Votes Cast */}
          <Card className="relative overflow-hidden border-0 bg-linear-to-brfrom-card to-card/80 shadow-sm">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 size-24 rounded-full bg-emerald-500/5" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-medium uppercase tracking-wider">
                  Votes Cast
                </CardDescription>
                <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Vote className="size-4 text-emerald-500" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold tabular-nums">
                {turnout.overall.totalVoted}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {turnout.overall.notVoted} haven&apos;t voted
              </p>
            </CardContent>
          </Card>

          {/* Positions */}
          <Card className="relative overflow-hidden border-0 bg-linear-to-brfrom-card to-card/80 shadow-sm">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 size-24 rounded-full bg-purple-500/5" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-medium uppercase tracking-wider">
                  Positions
                </CardDescription>
                <div className="flex size-9 items-center justify-center rounded-lg bg-purple-500/10">
                  <Trophy className="size-4 text-purple-500" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold tabular-nums">
                {results?.positions.length ?? 0}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Being contested</p>
            </CardContent>
          </Card>

          {/* Overall Turnout */}
          <Card className="relative overflow-hidden border-0 bg-linear-to-brfrom-card to-card/80 shadow-sm">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 size-24 rounded-full bg-amber-500/5" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-medium uppercase tracking-wider">
                  Overall Turnout
                </CardDescription>
                <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10">
                  <BarChart3 className="size-4 text-amber-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex justify-center pb-4">
              <TurnoutRing percent={turnout.overall.turnoutPercent} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Position Leaderboards */}
      {results && (
        <div className="grid gap-4 lg:grid-cols-2">
          {results.positions.map((position) => {
            const topVotes = Math.max(
              ...position.candidates.map((c) => c.votes),
              1,
            );
            return (
              <Card
                key={position.id}
                className="border-0 shadow-sm"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">
                        {position.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {position.totalVotes} vote
                        {position.totalVotes !== 1 ? "s" : ""} cast
                        {position.maxVotes > 1 &&
                          ` · Top ${position.maxVotes} win`}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {position.candidates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No candidates for this position.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {position.candidates.map((c, i) => {
                        const pct =
                          topVotes > 0
                            ? (c.votes / topVotes) * 100
                            : 0;
                        const isLeader = c.rank === 1 && c.votes > 0;
                        const gradientPair =
                          GRADIENT_PAIRS[i % GRADIENT_PAIRS.length];
                        return (
                          <div
                            key={c.id}
                            className={`flex items-center gap-3 rounded-lg p-2 transition-colors ${
                              isLeader
                                ? "bg-amber-500/5 ring-1 ring-amber-500/20"
                                : ""
                            }`}
                          >
                            <div className="relative size-9 shrink-0 overflow-hidden rounded-full bg-muted">
                              {c.imageUrl ? (
                                <Image
                                  src={c.imageUrl}
                                  alt={c.fullName}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex size-full items-center justify-center text-xs font-semibold text-muted-foreground">
                                  {c.fullName
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .slice(0, 2)}
                                </div>
                              )}
                              {isLeader && (
                                <div className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-amber-500 shadow-sm">
                                  <Crown className="size-2.5 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex items-center justify-between">
                                <div className="flex items-center gap-1.5 truncate">
                                  <span
                                    className={`truncate text-sm ${
                                      isLeader
                                        ? "font-bold"
                                        : "font-medium"
                                    }`}
                                  >
                                    {c.fullName}
                                  </span>
                                  {c.isWinner && (
                                    <Trophy className="size-3.5 shrink-0 text-amber-500" />
                                  )}
                                </div>
                                <span className="ml-2 shrink-0 text-sm font-semibold tabular-nums">
                                  {c.votes}
                                </span>
                              </div>
                              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/50">
                                <div
                                  className="h-full rounded-full transition-all duration-700 ease-out"
                                  style={{
                                    width: `${Math.max(pct, 2)}%`,
                                    background: c.partylist.color
                                      ? `linear-gradient(90deg, ${c.partylist.color}, ${c.partylist.color}dd)`
                                      : `linear-gradient(90deg, ${gradientPair[0]}, ${gradientPair[1]})`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Turnout by Section — List-based UI */}
      {turnout && turnout.sections.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Turnout by Section
            </CardTitle>
            <CardDescription className="text-xs">
              Voter participation rate per section
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {turnout.sections.map((s) => (
                <div key={s.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-4">
                    <span className="min-w-0 text-sm font-medium">
                      {s.name}
                    </span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                      {s.turnoutPercent}%{" "}
                      <span className="font-normal">
                        ({s.votedCount}/{s.totalVoters})
                      </span>
                    </span>
                  </div>
                  <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/40">
                    <div
                      className="h-full rounded-full bg-chart-1 transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.max(s.turnoutPercent, 1)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
