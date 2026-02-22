"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, BarChart3, RefreshCw, Trophy, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Progress } from "@/components/ui/progress";

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

      {/* Turnout overview cards */}
      {turnout && (
        <div className="grid gap-4 sm:grid-cols-3">
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
              <CardDescription>Overall Turnout</CardDescription>
              <CardTitle className="text-3xl">
                {turnout.overall.turnoutPercent}%
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress
                value={turnout.overall.turnoutPercent}
                className="h-2"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leading candidates per position (compact overview) */}
      {results && (
        <div className="grid gap-4 sm:grid-cols-2">
          {results.positions.map((position) => {
            const leader = position.candidates[0];
            const runnerUp = position.candidates[1];

            return (
              <Card key={position.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {position.name}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {position.totalVotes} vote
                      {position.totalVotes !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {leader ? (
                    <>
                      <div className="flex items-center gap-3">
                        <Trophy className="size-5 text-yellow-500" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">
                              {leader.fullName}
                            </span>
                            <span className="text-sm font-medium tabular-nums">
                              {leader.votes}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <Progress
                              value={
                                position.totalVotes > 0
                                  ? (leader.votes / position.totalVotes) * 100
                                  : 0
                              }
                              className="h-1.5 flex-1"
                            />
                            <span className="text-xs text-muted-foreground">
                              {position.totalVotes > 0
                                ? Math.round(
                                    (leader.votes / position.totalVotes) * 100,
                                  )
                                : 0}
                              %
                            </span>
                          </div>
                        </div>
                      </div>
                      {runnerUp && (
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <span className="flex size-5 items-center justify-center text-xs font-medium">
                            2
                          </span>
                          <div className="flex flex-1 items-center justify-between">
                            <span className="text-sm">
                              {runnerUp.fullName}
                            </span>
                            <span className="text-sm tabular-nums">
                              {runnerUp.votes}
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No candidates
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/dashboard/results/votes">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="size-4" />
                Detailed Vote Counts
                <ArrowRight className="ml-auto size-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Full ranked results for every position with vote percentages.
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/results/turnout">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4" />
                Voter Turnout by Section
                <ArrowRight className="ml-auto size-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Per-section breakdown of voter participation and turnout rates.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
