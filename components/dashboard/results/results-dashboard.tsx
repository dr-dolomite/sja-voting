"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Users, BarChart3, RefreshCw, Trophy } from "lucide-react";
import {
  Bar,
  BarChart,
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts";

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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

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

const turnoutChartConfig = {
  voted: { label: "Voted", color: "hsl(var(--chart-1))" },
  notVoted: { label: "Not Voted", color: "hsl(var(--muted))" },
} satisfies ChartConfig;

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
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">Results Summary</h2>
        <div className="flex items-center gap-3">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="w-64">
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh((v) => !v)}
          >
            <RefreshCw
              className={`mr-1.5 size-4 ${autoRefresh ? "animate-spin" : ""}`}
              style={autoRefresh ? { animationDuration: "3s" } : undefined}
            />
            {autoRefresh ? "Live" : "Paused"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-1.5 size-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Top row: stat cards + turnout pie */}
      {turnout && (
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Voters</CardDescription>
              <CardTitle className="text-3xl">
                {turnout.overall.totalVoters}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="size-4" />
                Registered voters
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Votes Cast</CardDescription>
              <CardTitle className="text-3xl">
                {turnout.overall.totalVoted}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BarChart3 className="size-4" />
                {turnout.overall.notVoted} haven&apos;t voted
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Positions</CardDescription>
              <CardTitle className="text-3xl">
                {results?.positions.length ?? 0}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Trophy className="size-4" />
                Being contested
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Overall Turnout</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <ChartContainer
                config={turnoutChartConfig}
                className="mx-auto aspect-square h-32"
              >
                <RadialBarChart
                  data={[
                    {
                      value: turnout.overall.turnoutPercent,
                      fill: "hsl(var(--chart-1))",
                    },
                  ]}
                  startAngle={90}
                  endAngle={
                    90 -
                    (turnout.overall.turnoutPercent / 100) * 360
                  }
                  innerRadius={40}
                  outerRadius={56}
                >
                  <PolarGrid
                    gridType="circle"
                    radialLines={false}
                    stroke="none"
                    className="first:fill-muted last:fill-background"
                    polarRadius={[56, 40]}
                  />
                  <RadialBar
                    dataKey="value"
                    cornerRadius={5}
                    background={false}
                  />
                  <PolarRadiusAxis
                    tick={false}
                    tickLine={false}
                    axisLine={false}
                  >
                    <Label
                      content={({ viewBox }) => {
                        if (
                          viewBox &&
                          "cx" in viewBox &&
                          "cy" in viewBox
                        ) {
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
                                className="fill-foreground text-2xl font-bold"
                              >
                                {turnout.overall.turnoutPercent}%
                              </tspan>
                            </text>
                          );
                        }
                      }}
                    />
                  </PolarRadiusAxis>
                </RadialBarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Per-position results */}
      {results && (
        <div className="grid gap-4 lg:grid-cols-2">
          {results.positions.map((position) => {
            const topVotes = Math.max(
              ...position.candidates.map((c) => c.votes),
              1,
            );
            return (
              <Card key={position.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {position.name}
                      </CardTitle>
                      <CardDescription>
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
                        const color =
                          c.partylist.color ??
                          COLORS[i % COLORS.length];
                        return (
                          <div
                            key={c.id}
                            className="flex items-center gap-3"
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
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex items-center justify-between">
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="truncate text-sm font-medium">
                                    {c.fullName}
                                  </span>
                                  {c.isWinner && (
                                    <Trophy className="size-3.5 shrink-0 text-yellow-500" />
                                  )}
                                </div>
                                <span className="ml-2 shrink-0 text-sm font-semibold tabular-nums">
                                  {c.votes}
                                </span>
                              </div>
                              <div className="h-2.5 w-full rounded-full bg-muted/50">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${Math.max(pct, 2)}%`,
                                    backgroundColor: color,
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

      {/* Section turnout bar chart */}
      {turnout && turnout.sections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Turnout by Section
            </CardTitle>
            <CardDescription>
              Voter participation rate per section
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={turnoutChartConfig}
              className="h-[calc(2.5rem*var(--bar-count)+2rem)]"
              style={
                {
                  "--bar-count": turnout.sections.length,
                } as React.CSSProperties
              }
            >
              <BarChart
                data={turnout.sections.map((s) => ({
                  name: s.name,
                  voted: s.votedCount,
                  notVoted: s.notVotedCount,
                }))}
                layout="vertical"
                margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
              >
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <XAxis type="number" hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="voted"
                  stackId="a"
                  fill="hsl(var(--chart-1))"
                  radius={[0, 0, 0, 0]}
                  barSize={24}
                />
                <Bar
                  dataKey="notVoted"
                  stackId="a"
                  fill="hsl(var(--muted))"
                  radius={[0, 4, 4, 0]}
                  barSize={24}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
