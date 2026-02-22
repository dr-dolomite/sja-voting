"use client";

import { useEffect, useState } from "react";
import { Users, BarChart3, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

import { getSectionTurnout } from "@/actions/results";

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

export function VoterTurnoutPage() {
  const [turnout, setTurnout] = useState<TurnoutData | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  async function handleRefresh() {
    setLoading(true);
    const data = await getSectionTurnout();
    setTurnout(data);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const data = await getSectionTurnout();
      if (!cancelled) setTurnout(data);
    }

    load();
    const interval = autoRefresh ? setInterval(load, 10000) : null;
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">Voter Turnout</h2>
        <div className="flex items-center gap-3">
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

      {/* Overview cards */}
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

      {/* Per-section table */}
      {turnout && turnout.sections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Per-Section Breakdown
            </CardTitle>
            <CardDescription>
              Voter participation by section
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

      {turnout && turnout.sections.length === 0 && (
        <p className="text-muted-foreground">
          No sections found. Import voters to see turnout data.
        </p>
      )}
    </div>
  );
}
