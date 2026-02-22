"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";

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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

import { submitVotes } from "@/actions/vote";

type Candidate = {
  id: string;
  fullName: string;
  description: string | null;
  imageUrl: string | null;
  partylist: { id: string; name: string; color: string | null };
};

type Position = {
  id: string;
  name: string;
  order: number;
  maxVotes: number;
  candidates: Candidate[];
};

type Election = {
  id: string;
  name: string;
  positions: Position[];
};

const DESC_TRUNCATE_LENGTH = 80;

export function BallotForm({ election }: { election: Election }) {
  const totalPages = election.positions.length + 1; // positions + review page
  const [page, setPage] = useState(0); // 0..positions.length (last = review)
  const isReviewPage = page === election.positions.length;

  const [selections, setSelections] = useState<Map<string, Set<string>>>(
    () => new Map(election.positions.map((p) => [p.id, new Set<string>()])),
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [descCandidate, setDescCandidate] = useState<Candidate | null>(null);

  function toggleCandidate(
    positionId: string,
    candidateId: string,
    maxVotes: number,
  ) {
    setSelections((prev) => {
      const next = new Map(prev);
      const selected = new Set(next.get(positionId) ?? []);

      if (selected.has(candidateId)) {
        selected.delete(candidateId);
      } else {
        if (selected.size >= maxVotes) {
          if (maxVotes === 1) {
            selected.clear();
            selected.add(candidateId);
          } else {
            toast.error(
              `You can only select up to ${maxVotes} candidate(s) for this position.`,
            );
            return prev;
          }
        } else {
          selected.add(candidateId);
        }
      }

      next.set(positionId, selected);
      return next;
    });
  }

  function getAllSelectedIds(): string[] {
    const ids: string[] = [];
    for (const set of selections.values()) {
      for (const id of set) ids.push(id);
    }
    return ids;
  }

  function getSelectionSummary() {
    return election.positions.map((position) => {
      const selected = selections.get(position.id) ?? new Set();
      const candidates = position.candidates.filter((c) => selected.has(c.id));
      return {
        position,
        selected: candidates,
        abstained: candidates.length === 0,
      };
    });
  }

  async function handleSubmit() {
    setLoading(true);
    const result = await submitVotes(getAllSelectedIds());
    setLoading(false);

    if (result?.error) {
      toast.error(result.error);
      setConfirmOpen(false);
    }
  }

  const filledPositions = election.positions.filter(
    (p) => (selections.get(p.id)?.size ?? 0) > 0,
  ).length;

  const progressPercent = ((page + 1) / totalPages) * 100;

  // ── Render a single position page ──────────────────────────

  function renderPositionPage(position: Position) {
    const selected = selections.get(position.id) ?? new Set();

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{position.name}</CardTitle>
          <CardDescription>
            Select{" "}
            {position.maxVotes === 1
              ? "one"
              : `up to ${position.maxVotes}`}{" "}
            candidate{position.maxVotes > 1 ? "s" : ""}
            {" · "}
            {selected.size}/{position.maxVotes} selected
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {position.candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No candidates for this position.
            </p>
          ) : (
            position.candidates.map((candidate) => {
              const isSelected = selected.has(candidate.id);
              const hasLongDesc =
                candidate.description &&
                candidate.description.length > DESC_TRUNCATE_LENGTH;

              return (
                <div key={candidate.id} className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      toggleCandidate(
                        position.id,
                        candidate.id,
                        position.maxVotes,
                      )
                    }
                    className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    {/* Avatar */}
                    {candidate.imageUrl ? (
                      <Image
                        src={candidate.imageUrl}
                        alt={candidate.fullName}
                        width={48}
                        height={48}
                        className="size-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                        {candidate.fullName
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    )}

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {candidate.fullName}
                        </span>
                        <Badge variant="outline" className="gap-1 text-xs">
                          {candidate.partylist.color && (
                            <span
                              className="inline-block size-2 rounded-full"
                              style={{
                                backgroundColor: candidate.partylist.color,
                              }}
                            />
                          )}
                          {candidate.partylist.name}
                        </Badge>
                      </div>
                      {candidate.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {hasLongDesc
                            ? candidate.description.slice(
                                0,
                                DESC_TRUNCATE_LENGTH,
                              ) + "…"
                            : candidate.description}
                        </p>
                      )}
                    </div>

                    {/* Check indicator */}
                    {isSelected && (
                      <CheckCircle2 className="size-5 shrink-0 text-primary" />
                    )}
                  </button>

                  {/* "Read more" button for long descriptions */}
                  {hasLongDesc && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDescCandidate(candidate);
                      }}
                      className="absolute right-2 bottom-2 flex items-center gap-1 rounded-md bg-muted/80 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Info className="size-3" />
                      Read more
                    </button>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Render review page ─────────────────────────────────────

  function renderReviewPage() {
    const summary = getSelectionSummary();

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Review Your Ballot</CardTitle>
          <CardDescription>
            Review your selections before submitting.{" "}
            {filledPositions}/{election.positions.length} positions filled.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {summary.map((item) => (
            <div key={item.position.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{item.position.name}</h3>
                <button
                  type="button"
                  onClick={() =>
                    setPage(election.positions.indexOf(item.position))
                  }
                  className="text-xs text-primary hover:underline"
                >
                  Change
                </button>
              </div>
              {item.abstained ? (
                <p className="text-sm italic text-muted-foreground">
                  Abstained (no selection)
                </p>
              ) : (
                item.selected.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 rounded-md border p-3"
                  >
                    {c.imageUrl ? (
                      <Image
                        src={c.imageUrl}
                        alt={c.fullName}
                        width={32}
                        height={32}
                        className="size-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {c.fullName
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium">{c.fullName}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {c.partylist.name}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // ── Main render ────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 pb-28">
      {/* Header + progress */}
      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-bold">{election.name}</h1>
        <div className="space-y-1">
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Step {page + 1} of {totalPages}
            {isReviewPage
              ? " — Review"
              : ` — ${election.positions[page].name}`}
          </p>
        </div>
      </div>

      {/* Current page content */}
      {isReviewPage
        ? renderReviewPage()
        : renderPositionPage(election.positions[page])}

      {/* Navigation bar */}
      <div className="fixed inset-x-0 bottom-0 border-t bg-background p-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="mr-1 size-4" />
            Back
          </Button>

          <span className="text-sm text-muted-foreground">
            {filledPositions}/{election.positions.length} positions filled
          </span>

          {isReviewPage ? (
            <Button size="lg" onClick={() => setConfirmOpen(true)}>
              Submit Votes
            </Button>
          ) : (
            <Button onClick={() => setPage((p) => p + 1)}>
              {page === election.positions.length - 1 ? "Review" : "Next"}
              <ChevronRight className="ml-1 size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Confirm submission dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Your Votes</AlertDialogTitle>
            <AlertDialogDescription>
              Once submitted, you cannot change your votes. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={loading}>
              {loading ? "Submitting…" : "Submit Votes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Candidate description popup */}
      <Dialog
        open={!!descCandidate}
        onOpenChange={(open) => {
          if (!open) setDescCandidate(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {descCandidate?.imageUrl ? (
                <Image
                  src={descCandidate.imageUrl}
                  alt={descCandidate.fullName}
                  width={40}
                  height={40}
                  className="size-10 rounded-full object-cover"
                />
              ) : (
                descCandidate && (
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {descCandidate.fullName
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )
              )}
              <div>
                <span>{descCandidate?.fullName}</span>
                {descCandidate?.partylist && (
                  <Badge
                    variant="outline"
                    className="ml-2 gap-1 text-xs align-middle"
                  >
                    {descCandidate.partylist.color && (
                      <span
                        className="inline-block size-2 rounded-full"
                        style={{
                          backgroundColor: descCandidate.partylist.color,
                        }}
                      />
                    )}
                    {descCandidate.partylist.name}
                  </Badge>
                )}
              </div>
            </DialogTitle>
            <DialogDescription className="whitespace-pre-wrap pt-2">
              {descCandidate?.description}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
