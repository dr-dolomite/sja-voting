"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Vote } from "lucide-react";

import { getElectionResults, getSectionTurnout } from "@/actions/results";
import { Card } from "../ui/card";

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

type TurnoutOverall = {
  totalVoters: number;
  totalVoted: number;
  notVoted: number;
  turnoutPercent: number;
};

const GRADIENT_PAIRS = [
  ["#6366f1", "#a78bfa"],
  ["#3b82f6", "#60a5fa"],
  ["#8b5cf6", "#c084fc"],
  ["#ec4899", "#f472b6"],
  ["#f59e0b", "#fbbf24"],
  ["#10b981", "#34d399"],
  ["#ef4444", "#f87171"],
  ["#06b6d4", "#22d3ee"],
];

/* ------------------------------------------------------------------ */
/*  Position Carousel                                                  */
/* ------------------------------------------------------------------ */

function PositionCarousel({ positions }: { positions: PositionResult[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  // Auto-advance every 8 seconds
  useEffect(() => {
    if (positions.length <= 1) return;
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % positions.length);
    }, 8000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [positions.length]);

  const goTo = (index: number) => {
    setActiveIndex(index);
    // Reset timer on manual navigation
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % positions.length);
    }, 8000);
  };

  const position = positions[activeIndex];
  if (!position) return null;

  const topVotes = Math.max(...position.candidates.map((c) => c.votes), 1);

  return (
    <div className="w-full space-y-6">
      {/* Position title */}
      <div className="text-center">
        <h3 className="text-2xl font-bold sm:text-3xl">{position.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {position.totalVotes} vote{position.totalVotes !== 1 ? "s" : ""} cast
          {position.maxVotes > 1 && ` \u00b7 Top ${position.maxVotes} win`}
        </p>
      </div>

      {/* Candidates */}
      <Card className="p-6">
        {position.candidates.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No candidates for this position.
          </p>
        ) : (
          position.candidates.map((c, i) => {
            const pct = topVotes > 0 ? (c.votes / topVotes) * 100 : 0;
            const isLeader = c.rank === 1 && c.votes > 0;
            const gradientPair = GRADIENT_PAIRS[i % GRADIENT_PAIRS.length];

            return (
              <div
                key={c.id}
                className={`flex items-center gap-4 rounded-xl p-3 transition-all duration-500 ${
                  isLeader
                    ? "bg-primary/10 ring-1 ring-primary/30"
                    : "bg-card/50"
                }`}
              >
                {/* Avatar */}
                <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-muted sm:size-20">
                  {c.imageUrl ? (
                    <Image
                      src={c.imageUrl}
                      alt={c.fullName}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-lg font-bold text-muted-foreground sm:text-xl">
                      {c.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`truncate text-base sm:text-lg ${
                          isLeader ? "font-bold" : "font-semibold"
                        }`}
                      >
                        {c.fullName}
                      </span>
                      {c.partylist.color && (
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: c.partylist.color }}
                        />
                      )}
                    </div>
                    <span className="shrink-0 text-lg font-bold tabular-nums sm:text-xl">
                      {c.votes}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted/30">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.max(pct, 2)}%`,
                        background: c.partylist.color
                          ? `linear-gradient(90deg, ${c.partylist.color}, ${c.partylist.color}cc)`
                          : `linear-gradient(90deg, ${gradientPair[0]}, ${gradientPair[1]})`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </Card>

      {/* Carousel dots */}
      {positions.length > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          {positions.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? "w-8 bg-primary"
                  : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
              aria-label={`Go to position ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  No Active Election Placeholder                                     */
/* ------------------------------------------------------------------ */

function NoActiveElection() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-muted">
          <Vote className="size-10 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            No Active Election
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            There is no election currently in progress.
            <br />
            Results will appear here once an election begins.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function LiveResults({
  activeElection,
}: {
  activeElection: { id: string; name: string } | null;
}) {
  const [results, setResults] = useState<ElectionResult | null>(null);
  const [turnout, setTurnout] = useState<TurnoutOverall | null>(null);

  const activeElectionId = activeElection?.id;

  const fetchData = useCallback(async () => {
    if (!activeElectionId) return;
    const [electionResults, turnoutData] = await Promise.all([
      getElectionResults(activeElectionId),
      getSectionTurnout(),
    ]);
    setResults(electionResults);
    setTurnout(turnoutData?.overall ?? null);
  }, [activeElectionId]);

  useEffect(() => {
    const timeout = setTimeout(fetchData, 0);
    const interval = setInterval(fetchData, 8000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [fetchData]);

  if (!activeElection) {
    return <NoActiveElection />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Hero Header */}
      <header className="border-b bg-card/50 px-6 py-6 backdrop-blur-sm sm:py-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Election Results
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {activeElection.name}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Turnout mini */}
            {turnout && (
              <span className="text-sm font-medium text-muted-foreground">
                {turnout.totalVoted}/{turnout.totalVoters} voted
              </span>
            )}
            {/* LIVE badge */}
            <span className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1.5 text-sm font-bold tracking-wide text-red-500">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
              </span>
              LIVE
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center gap-10 px-6 py-8 sm:py-12">
        {/* Position Carousel */}
        {results && results.positions.length > 0 && (
          <PositionCarousel positions={results.positions} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t px-6 py-4 text-center text-xs text-muted-foreground">
        Results refresh automatically &middot; SJA Voting System
      </footer>

      {/* Preload all candidate images so carousel transitions are instant */}
      {results && <ImagePreloader results={results} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Image Preloader – eagerly fetches every candidate image            */
/* ------------------------------------------------------------------ */

function ImagePreloader({ results }: { results: ElectionResult }) {
  const urls = Array.from(
    new Set(
      results.positions.flatMap((p) =>
        p.candidates.map((c) => c.imageUrl).filter(Boolean),
      ),
    ),
  ) as string[];

  if (urls.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed -left-2499.75 -top-2499.75 size-0 overflow-hidden"
      aria-hidden="true"
    >
      {urls.map((url) => (
        <Image key={url} src={url} alt="" width={80} height={80} priority />
      ))}
    </div>
  );
}
