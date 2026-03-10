"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Plus, Pencil, Trash2, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Checkbox } from "@/components/ui/checkbox";
import {
  createCandidate,
  updateCandidate,
  deleteCandidate,
  deleteCandidates,
} from "@/actions/candidates";

// ─── Types ──────────────────────────────────────────────────────

type Candidate = {
  id: string;
  fullName: string;
  description: string | null;
  imageUrl: string | null;
  positionId: string;
  partylistId: string;
  position: {
    id: string;
    name: string;
    election: { id: string; name: string };
  };
  partylist: { id: string; name: string; color: string | null };
  _count: { votes: number };
};

type ElectionWithPositions = {
  id: string;
  name: string;
  positions: { id: string; name: string; order: number }[];
};

type Partylist = {
  id: string;
  name: string;
  color: string | null;
};

// ─── Component ──────────────────────────────────────────────────

export function CandidateList({
  candidates,
  elections,
  partylists,
}: {
  candidates: Candidate[];
  elections: ElectionWithPositions[];
  partylists: Partylist[];
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [createImageUrl, setCreateImageUrl] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  // Filters
  const [filterElection, setFilterElection] = useState("");
  const [filterPartylist, setFilterPartylist] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCandidates = candidates.filter((c) => {
    const matchElection =
      !filterElection || c.position.election.id === filterElection;
    const matchPartylist =
      !filterPartylist || c.partylist.id === filterPartylist;
    const matchSearch =
      !searchQuery ||
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.position.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchElection && matchPartylist && matchSearch;
  });

  // ── Form state for create/edit selectors ────────────────────
  const [formElectionId, setFormElectionId] = useState("");

  const formPositions =
    elections.find((e) => e.id === formElectionId)?.positions ?? [];

  function openCreate() {
    setFormElectionId(elections[0]?.id ?? "");
    setCreateOpen(true);
  }

  function openEdit(candidate: Candidate) {
    setSelected(candidate);
    setFormElectionId(candidate.position.election.id);
    setEditImageUrl(candidate.imageUrl ?? "");
    setEditOpen(true);
  }

  async function handleImageUpload(
    file: File,
    setUrl: (url: string) => void,
  ) {
    setUploadingImage(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload/candidate-image", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error ?? "Upload failed.");
      } else {
        setUrl(data.url);
      }
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploadingImage(false);
    }
  }

  // ── Handlers ────────────────────────────────────────────────

  async function handleCreate(formData: FormData) {
    setLoading(true);
    const result = await createCandidate(formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Candidate added.");
    setCreateOpen(false);
    setCreateImageUrl("");
    router.refresh();
  }

  async function handleUpdate(formData: FormData) {
    setLoading(true);
    const result = await updateCandidate(formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Candidate updated.");
    setEditOpen(false);
    setSelected(null);
    router.refresh();
  }

  async function handleDelete() {
    if (!selected) return;
    setLoading(true);
    const result = await deleteCandidate(selected.id);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Candidate deleted.");
    setDeleteOpen(false);
    setSelected(null);
    router.refresh();
  }

  async function handleBulkDelete() {
    setLoading(true);
    const result = await deleteCandidates([...selectedIds]);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(`${selectedIds.size} candidate(s) deleted.`);
    setBulkDeleteOpen(false);
    setSelectedIds(new Set());
    router.refresh();
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const filteredIds = filteredCandidates.map((c) => c.id);
    const allSelected = filteredIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  const allFilteredSelected =
    filteredCandidates.length > 0 &&
    filteredCandidates.every((c) => selectedIds.has(c.id));
  const someFilteredSelected =
    !allFilteredSelected &&
    filteredCandidates.some((c) => selectedIds.has(c.id));

  // ── Shared form fields ──────────────────────────────────────

  function renderFormFields(
    defaults: {
      fullName: string;
      description: string | null;
      imageUrl: string | null;
      positionId: string;
      partylistId: string;
    } | undefined,
    imageUrl: string,
    setImageUrl: (url: string) => void,
  ) {
    return (
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="cand-fullname">Full Name</Label>
          <Input
            id="cand-fullname"
            name="fullName"
            placeholder="e.g. Juan Dela Cruz"
            defaultValue={defaults?.fullName ?? ""}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cand-description">
            Description{" "}
            <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="cand-description"
            name="description"
            placeholder="Short bio or platform"
            defaultValue={defaults?.description ?? ""}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cand-image">
            Image <span className="text-muted-foreground">(optional)</span>
          </Label>
          {/* Hidden input submits the value with the form */}
          <input type="hidden" name="imageUrl" value={imageUrl} />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadingImage}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/jpeg,image/png,image/webp";
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleImageUpload(file, setImageUrl);
                };
                input.click();
              }}
            >
              {uploadingImage ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Upload
            </Button>
            <Input
              id="cand-image"
              placeholder="https://… or upload above"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              disabled={uploadingImage}
            />
          </div>
          {imageUrl && (
            <div className="flex items-center gap-2">
              <Image
                src={imageUrl}
                alt="Preview"
                width={40}
                height={40}
                className="size-10 rounded-full object-cover border"
              />
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-destructive"
                onClick={() => setImageUrl("")}
              >
                Remove
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Election</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={formElectionId}
              onChange={(e) => setFormElectionId(e.target.value)}
            >
              <option value="" disabled>
                Select election
              </option>
              {elections.map((el) => (
                <option key={el.id} value={el.id}>
                  {el.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cand-position">Position</Label>
            <select
              id="cand-position"
              name="positionId"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue={defaults?.positionId ?? ""}
              required
            >
              <option value="" disabled>
                Select position
              </option>
              {formPositions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cand-partylist">Partylist</Label>
          <select
            id="cand-partylist"
            name="partylistId"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            defaultValue={defaults?.partylistId ?? ""}
            required
          >
            <option value="" disabled>
              Select partylist
            </option>
            {partylists.map((pl) => (
              <option key={pl.id} value={pl.id}>
                {pl.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="max-w-sm">
          <InputGroupInput
            placeholder="Search name or position…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <InputGroupAddon align="inline-start">
            <SearchIcon className="text-muted-foreground" />
          </InputGroupAddon>
        </InputGroup>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={filterElection}
          onChange={(e) => setFilterElection(e.target.value)}
        >
          <option value="">All elections</option>
          {elections.map((el) => (
            <option key={el.id} value={el.id}>
              {el.name}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={filterPartylist}
          onChange={(e) => setFilterPartylist(e.target.value)}
        >
          <option value="">All partylists</option>
          {partylists.map((pl) => (
            <option key={pl.id} value={pl.id}>
              {pl.name}
            </option>
          ))}
        </select>
        <div className="ml-auto flex gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="size-4" />
              Delete Selected ({selectedIds.size})
            </Button>
          )}
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add Candidate
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>Total: {candidates.length}</span>
        {filteredCandidates.length !== candidates.length && (
          <span>Showing: {filteredCandidates.length}</span>
        )}
      </div>

      {/* Table */}
      {candidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No candidates yet.</p>
          <p className="text-sm text-muted-foreground">
            Add candidates to positions within an election.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      allFilteredSelected
                        ? true
                        : someFilteredSelected
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Election</TableHead>
                <TableHead>Partylist</TableHead>
                <TableHead className="w-12.5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCandidates.map((candidate) => (
                <TableRow key={candidate.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(candidate.id)}
                      onCheckedChange={() => toggleSelect(candidate.id)}
                      aria-label={`Select ${candidate.fullName}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {candidate.imageUrl ? (
                        <Image
                          src={candidate.imageUrl}
                          alt={candidate.fullName}
                          width={32}
                          height={32}
                          className="size-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                          {candidate.fullName
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{candidate.fullName}</div>
                        {candidate.description && (
                          <div className="max-w-xs truncate text-xs text-muted-foreground">
                            {candidate.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{candidate.position.name}</TableCell>
                  <TableCell>{candidate.position.election.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1.5">
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
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(candidate)}>
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => {
                            setSelected(candidate);
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Candidate</DialogTitle>
            <DialogDescription>
              Add a new candidate to a position.
            </DialogDescription>
          </DialogHeader>
          <form action={handleCreate}>
            {renderFormFields(undefined, createImageUrl, setCreateImageUrl)}
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? "Adding…" : "Add Candidate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) { setSelected(null); setEditImageUrl(""); }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Candidate</DialogTitle>
            <DialogDescription>Update candidate details.</DialogDescription>
          </DialogHeader>
          <form action={handleUpdate}>
            <input type="hidden" name="id" value={selected?.id ?? ""} />
            {renderFormFields(
              selected
                ? {
                    fullName: selected.fullName,
                    description: selected.description,
                    imageUrl: selected.imageUrl,
                    positionId: selected.positionId,
                    partylistId: selected.partylistId,
                  }
                : undefined,
              editImageUrl,
              setEditImageUrl,
            )}
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setSelected(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Candidate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selected?.fullName}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading}>
              {loading ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Candidate(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} selected
              candidate(s)? This action cannot be undone and will also remove
              their associated votes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={loading}>
              {loading ? "Deleting…" : `Delete ${selectedIds.size} Candidate(s)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
