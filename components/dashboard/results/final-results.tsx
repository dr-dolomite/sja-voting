"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Medal, Trophy, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getElectionResults } from "@/actions/results";
import { Badge } from "@/components/ui/badge";

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

export function FinalResults({ elections }: { elections: Election[] }) {
  const activeElection = elections.find((e) => e.isActive);
  const [selectedId, setSelectedId] = useState(
    activeElection?.id ?? elections[0]?.id ?? "",
  );
  const [results, setResults] = useState<ElectionResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRefresh() {
    if (!selectedId) return;
    setLoading(true);
    const data = await getElectionResults(selectedId);
    setResults(data);
    setLoading(false);
  }

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;

    async function load() {
      const data = await getElectionResults(selectedId);
      if (!cancelled) setResults(data);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  if (elections.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Final Results</h2>
        <p className="text-muted-foreground">
          No elections found. Create an election first.
        </p>
      </div>
    );
  }

  // Group positions by name so grade-level variants (e.g. "Representative")
  // appear together under one heading.
  const groups = new Map<string, PositionResult[]>();
  if (results) {
    for (const pos of results.positions) {
      const key = pos.name;
      const arr = groups.get(key) ?? [];
      arr.push(pos);
      groups.set(key, arr);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Final Election Results
            </h2>
            {results && (
              <p className="text-sm text-muted-foreground">
                {results.name} — elected officials
              </p>
            )}
          </div>
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

      {/* Results content */}
      {results && results.positions.length > 0 ? (
        <div className="space-y-6">
          {[...groups.entries()].map(([positionName, positions]) => {
            const isGrouped =
              positions.length > 1 || positions.some((p) => p.gradeLevels.length > 0);
            return (
              <div key={positionName}>
                {/* Position heading */}
                <div className="mb-3 flex items-center gap-2">
                  <Medal className="size-4 shrink-0 text-muted-foreground" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {positionName}
                  </h3>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Cards grid — one per grade-level slot (or just one for non-grouped) */}
                <div
                  className={`grid gap-3 ${
                    isGrouped
                      ? "sm:grid-cols-2 lg:grid-cols-3"
                      : "sm:grid-cols-1 lg:grid-cols-2"
                  }`}
                >
                  {positions.map((pos) => {
                    const winners = pos.candidates.filter((c) => c.isWinner);
                    const hasWinner = winners.length > 0;

                    return (
                      <Card
                        key={pos.id}
                        className={`border transition-colors ${
                          hasWinner
                            ? "border-primary bg-primary/2"
                            : "border-dashed bg-muted/20"
                        }`}
                      >
                        <CardContent className="p-6">
                          {/* Grade level badge (for dynamic positions) */}
                          {pos.gradeLevels.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-1">
                              {pos.gradeLevels.map((gl) => (
                                <Badge key={gl}>{gl}</Badge>
                              ))}
                            </div>
                          )}

                          {!hasWinner ? (
                            <p className="py-2 text-sm italic text-muted-foreground">
                              No winner declared yet
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {winners.map((w) => (
                                <div
                                  key={w.id}
                                  className="flex items-center gap-3"
                                >
                                  {/* Avatar */}
                                  <div className="relative size-24 shrink-0 overflow-hidden rounded-full bg-muted ring-2 ring-primary/30">
                                    {w.imageUrl ? (
                                      <Image
                                        src={w.imageUrl}
                                        alt={w.fullName}
                                        fill
                                        className="object-cover"
                                      />
                                    ) : (
                                      <div className="flex size-full items-center justify-center text-3xl font-bold text-muted-foreground">
                                        {w.fullName
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")
                                          .slice(0, 2)}
                                      </div>
                                    )}
                                  </div>

                                  {/* Info */}
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-2xl font-bold leading-tight">
                                      {w.fullName}
                                    </p>
                                    <div className="mt-1 flex items-center gap-1.5">
                                      {w.partylist.color && (
                                        <span
                                          className="inline-block size-2 shrink-0 rounded-full"
                                          style={{
                                            backgroundColor: w.partylist.color,
                                          }}
                                        />
                                      )}
                                      <span className="truncate text-md text-muted-foreground font-semibold">
                                        {w.partylist.name}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Vote count */}
                                  <div className="shrink-0 text-right">
                                    <p className="text-4xl font-bold tabular-nums">
                                      {w.votes}
                                    </p>
                                    <span className="text-xs text-muted-foreground">
                                      votes
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : results ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="mb-3 size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No positions found for this election.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
