"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Trophy, Users, BarChart3, RefreshCw } from "lucide-react";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

import {
  getElectionResults,
  getSectionTurnout,
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
  totalVotes: number;
  candidates: CandidateResult[];
};

type ElectionResult = {
  id: string;
  name: string;
  isActive: boolean;
  positions: PositionResult[];
};

type SectionStat = {
  id: string;
  name: string;
  totalVoters: number;
  votedCount: number;
  notVotedCount: number;
  turnoutPercent: number;
};

type TurnoutData = {
  sections: SectionStat[];
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

  // Fetch used by manual refresh button only (safe to call setState)
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

  // Initial fetch + auto-refresh every 10 seconds
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
        <h2 className="text-2xl font-bold">Results</h2>
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
        <h2 className="text-2xl font-bold">Results & Statistics</h2>
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
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`mr-1.5 size-4 ${loading ? "animate-spin" : ""}`} />
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

      {/* Election results by position */}
      {results && (
        <div className="space-y-6">
          {results.positions.map((position) => (
            <Card key={position.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{position.name}</CardTitle>
                    <CardDescription>
                      {position.totalVotes} total vote
                      {position.totalVotes !== 1 ? "s" : ""} cast
                      {position.maxVotes > 1 &&
                        ` · Top ${position.maxVotes} win`}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {position.candidates.length} candidate
                    {position.candidates.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {position.candidates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No candidates for this position.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Candidate</TableHead>
                        <TableHead>Partylist</TableHead>
                        <TableHead className="w-40">Votes</TableHead>
                        <TableHead className="w-20 text-right">
                          Count
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {position.candidates.map((candidate) => {
                        const pct =
                          position.totalVotes > 0
                            ? Math.round(
                                (candidate.votes / position.totalVotes) * 100,
                              )
                            : 0;

                        return (
                          <TableRow
                            key={candidate.id}
                            className={
                              candidate.isWinner
                                ? "bg-green-50 dark:bg-green-900/10"
                                : ""
                            }
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-1.5">
                                {candidate.isWinner && (
                                  <Trophy className="size-4 text-yellow-500" />
                                )}
                                {candidate.rank}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {candidate.imageUrl ? (
                                  <Image
                                    src={candidate.imageUrl}
                                    alt={candidate.fullName}
                                    width={36}
                                    height={36}
                                    className="size-9 rounded-md object-cover"
                                  />
                                ) : (
                                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium">
                                    {candidate.fullName
                                      .split(" ")
                                      .map((w) => w[0])
                                      .join("")
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </div>
                                )}
                                <span className="font-medium">
                                  {candidate.fullName}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="gap-1.5 text-xs"
                              >
                                {candidate.partylist.color && (
                                  <span
                                    className="inline-block size-2 rounded-full"
                                    style={{
                                      backgroundColor:
                                        candidate.partylist.color,
                                    }}
                                  />
                                )}
                                {candidate.partylist.name}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={pct}
                                  className="h-2 flex-1"
                                />
                                <span className="w-10 text-right text-xs text-muted-foreground">
                                  {pct}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              {candidate.votes}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Per-section turnout table */}
      {turnout && turnout.sections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Per-Section Voter Turnout
            </CardTitle>
            <CardDescription>
              Breakdown of voter participation by section
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead className="w-24 text-right">Registered</TableHead>
                  <TableHead className="w-24 text-right">Voted</TableHead>
                  <TableHead className="w-24 text-right">Not Voted</TableHead>
                  <TableHead className="w-48">Turnout</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {turnout.sections.map((section) => (
                  <TableRow key={section.id}>
                    <TableCell className="font-medium">
                      {section.name}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {section.totalVoters}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {section.votedCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {section.notVotedCount}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={section.turnoutPercent}
                          className="h-2 flex-1"
                        />
                        <span className="w-10 text-right text-xs font-medium tabular-nums">
                          {section.turnoutPercent}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
