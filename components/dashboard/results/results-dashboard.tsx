"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, BarChart3, RefreshCw, Trophy, Vote } from "lucide-react";

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

import { CartesianGrid, Line, LineChart, XAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

import { Cell, Label, Pie, PieChart, Sector } from "recharts";
import { type PieSectorDataItem } from "recharts/types/polar/Pie";

type PartylistPieEntry = {
  name: string;
  votes: number;
  color: string;
};

const FALLBACK_COLORS = [
  "#6366f1",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#06b6d4",
];

const chartConfig = {
  login_activity: {
    label: "User Logins",
  },
  vote_activity: {
    label: "Votes Cast",
  },
  login: {
    label: "Login",
    color: "var(--chart-1)",
  },
  vote: {
    label: "Vote",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

type ChartDataPoint = { date: string; login: number; vote: number };

import {
  getElectionResults,
  getSectionTurnout,
  getActivityOverTime,
} from "@/actions/results";

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
  gradeLevels: string[];
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

export function ResultsDashboard({ elections }: { elections: Election[] }) {
  const activeElection = elections.find((e) => e.isActive);
  const [selectedId, setSelectedId] = useState(
    activeElection?.id ?? elections[0]?.id ?? "",
  );
  const [results, setResults] = useState<ElectionResult | null>(null);
  const [turnout, setTurnout] = useState<TurnoutData | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  const [activeChart, setActiveChart] =
    useState<keyof typeof chartConfig>("login");
  const [activePartylistIdx, setActivePartylistIdx] = useState(0);

  // Aggregate votes per partylist from election results
  const partylistPieData = useMemo<PartylistPieEntry[]>(() => {
    if (!results) return [];
    const map = new Map<string, { votes: number; color: string }>();
    for (const pos of results.positions) {
      for (const c of pos.candidates) {
        const key = c.partylist.name;
        const existing = map.get(key);
        if (existing) {
          existing.votes += c.votes;
        } else {
          map.set(key, {
            votes: c.votes,
            color:
              c.partylist.color ??
              FALLBACK_COLORS[map.size % FALLBACK_COLORS.length],
          });
        }
      }
    }
    return [...map.entries()]
      .map(([name, { votes, color }]) => ({ name, votes, color }))
      .sort((a, b) => b.votes - a.votes);
  }, [results]);

  // Build dynamic chart config for pie tooltip labels
  const pieChartConfig = useMemo(() => {
    const cfg: ChartConfig = { votes: { label: "Votes" } };
    for (const entry of partylistPieData) {
      cfg[entry.name] = { label: entry.name, color: entry.color };
    }
    return cfg;
  }, [partylistPieData]);

  const total = useMemo(
    () => ({
      login: chartData.reduce((acc, curr) => acc + curr.login, 0),
      vote: chartData.reduce((acc, curr) => acc + curr.vote, 0),
    }),
    [chartData],
  );

  async function handleRefresh() {
    if (!selectedId) return;
    setLoading(true);
    const [electionResults, turnoutData, activityData] = await Promise.all([
      getElectionResults(selectedId),
      getSectionTurnout(),
      getActivityOverTime(),
    ]);
    setResults(electionResults);
    setTurnout(turnoutData);
    setChartData(activityData);
    setLoading(false);
  }

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;

    async function load() {
      const [electionResults, turnoutData, activityData] = await Promise.all([
        getElectionResults(selectedId),
        getSectionTurnout(),
        getActivityOverTime(),
      ]);
      if (!cancelled) {
        setResults(electionResults);
        setTurnout(turnoutData);
        setChartData(activityData);
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
          <h2 className="text-2xl font-bold tracking-tight">Results Summary</h2>
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
              className={`size-3.5 ${autoRefresh ? "animate-spin" : ""}`}
              style={autoRefresh ? { animationDuration: "3s" } : undefined}
            />
            {autoRefresh ? "Auto" : "Paused"}
          </Button>
          <Button
            size="sm"
            className="h-8 px-2.5 text-xs"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw
              className={`size-3.5 ${loading ? "animate-spin" : ""}`}
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
            <div className="absolute top-0 right-0 -mt-2 -mr-4 size-24 rounded-full bg-blue-500/5" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-medium uppercase tracking-wider">
                  Total Voters
                </CardDescription>
                <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 -mr-2">
                  <Users className="size-4 text-blue-500" />
                </div>
              </div>
              <CardTitle className="text-5xl font-bold tabular-nums">
                {turnout.overall.totalVoters}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Registered voters</p>
            </CardContent>
          </Card>

          {/* Votes Cast */}
          <Card className="relative overflow-hidden border-0 bg-linear-to-brfrom-card to-card/80 shadow-sm">
            <div className="absolute top-0 right-0 -mt-2 -mr-4 size-24 rounded-full bg-emerald-500/5" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-medium uppercase tracking-wider">
                  Votes Cast
                </CardDescription>
                <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 -mr-2">
                  <Vote className="size-4 text-emerald-500 " />
                </div>
              </div>
              <CardTitle className="text-5xl font-bold tabular-nums">
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
            <div className="absolute top-0 right-0 -mt-2 -mr-4 size-24 rounded-full bg-purple-500/5" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-medium uppercase tracking-wider">
                  Positions
                </CardDescription>
                <div className="flex size-9 items-center justify-center rounded-lg bg-purple-500/10 -mr-2">
                  <Trophy className="size-4 text-purple-500" />
                </div>
              </div>
              <CardTitle className="text-5xl font-bold tabular-nums">
                {results?.positions.length ?? 0}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Being contested</p>
            </CardContent>
          </Card>

          {/* Overall Turnout */}
          <Card className="relative overflow-hidden border-0 bg-linear-to-brfrom-card to-card/80 shadow-sm">
            <div className="absolute top-0 right-0 -mt-2 -mr-4 size-24 rounded-full bg-amber-500/5" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-medium uppercase tracking-wider">
                  Overall Turnout
                </CardDescription>
                <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 -mr-2">
                  <BarChart3 className="size-4 text-amber-500" />
                </div>
              </div>
              <CardTitle className="text-5xl font-bold tabular-nums">
                {turnout.overall.turnoutPercent}%
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {turnout.overall.totalVoted} of {turnout.overall.totalVoters}{" "}
                voted
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 
      Line Chart for Votes and Login Over Time
      To contrast logins and votes
      */}
      <div className="grid xl:grid-cols-2 grid-cols-1 gap-4">
        <Card className="py-4 sm:py-0">
          <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
            <div className="flex flex-1 flex-col justify-center gap-1 px-6 pb-3 sm:pb-0">
              <CardTitle>
                Votes and Logins Over Time
              </CardTitle>
              <CardDescription>
                Showing data for the {results?.name ?? "selected election"}
              </CardDescription>
            </div>
            <div className="flex">
              {["login", "vote"].map((key) => {
                const chart = key as keyof typeof chartConfig;
                return (
                  <button
                    key={chart}
                    data-active={activeChart === chart}
                    className="flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                    onClick={() => setActiveChart(chart)}
                  >
                    <span className="text-xs text-muted-foreground">
                      {chartConfig[chart].label}
                    </span>
                    <span className="text-lg leading-none font-bold sm:text-3xl">
                      {total[key as keyof typeof total].toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:p-6">
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-62 w-full"
            >
              <LineChart
                accessibilityLayer
                data={chartData}
                margin={{
                  left: 12,
                  right: 12,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="w-38"
                      nameKey={activeChart}
                      labelFormatter={(value) => {
                        return new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });
                      }}
                    />
                  }
                />
                <Line
                  dataKey={activeChart}
                  type="monotone"
                  stroke={`var(--color-${activeChart})`}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Votes per Partylist Pie Chart */}
        <Card className="flex flex-col">
          <CardHeader className="flex-row items-start space-y-0 pb-0">
            <div className="grid gap-1">
              <CardTitle>Votes per Partylist</CardTitle>
              <CardDescription>
                Total votes across all positions
              </CardDescription>
            </div>
            {partylistPieData.length > 0 && (
              <Select
                value={String(activePartylistIdx)}
                onValueChange={(v) => setActivePartylistIdx(Number(v))}
              >
                <SelectTrigger
                  className="ml-auto h-7 w-40 rounded-lg pl-2.5"
                  aria-label="Select a partylist"
                >
                  <SelectValue placeholder="Select partylist" />
                </SelectTrigger>
                <SelectContent align="end" className="rounded-xl">
                  {partylistPieData.map((entry, idx) => (
                    <SelectItem
                      key={entry.name}
                      value={String(idx)}
                      className="rounded-lg [&_span]:flex"
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className="flex h-3 w-3 shrink-0 rounded-xs"
                          style={{ backgroundColor: entry.color }}
                        />
                        {entry.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardHeader>
          <CardContent className="flex flex-1 justify-center pb-0">
            {partylistPieData.length === 0 ? (
              <p className="py-12 text-sm text-muted-foreground">
                No vote data yet.
              </p>
            ) : (
              <ChartContainer
                config={pieChartConfig}
                className="mx-auto aspect-square w-full max-w-75"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={partylistPieData}
                    dataKey="votes"
                    nameKey="name"
                    innerRadius={60}
                    strokeWidth={5}
                    activeIndex={activePartylistIdx}
                    activeShape={({
                      outerRadius = 0,
                      ...props
                    }: PieSectorDataItem) => (
                      <g>
                        <Sector {...props} outerRadius={outerRadius + 10} />
                        <Sector
                          {...props}
                          outerRadius={outerRadius + 25}
                          innerRadius={outerRadius + 12}
                        />
                      </g>
                    )}
                  >
                    {partylistPieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          const active = partylistPieData[activePartylistIdx];
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={viewBox.cy}
                                className="fill-foreground text-3xl font-bold"
                              >
                                {active?.votes.toLocaleString() ?? 0}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 24}
                                className="fill-muted-foreground text-xs"
                              >
                                {active?.name ?? "Votes"}
                              </tspan>
                            </text>
                          );
                        }
                      }}
                    />
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

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
