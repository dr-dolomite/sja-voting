"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Trash,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  createVoter,
  updateVoter,
  deleteVoter,
  deleteAllVoters,
  importVoters,
} from "@/actions/voters";

type Voter = {
  id: string;
  lrn: string;
  hasVoted: boolean;
  votedAt: Date | null;
  createdAt: Date;
  section: { id: string; name: string };
};

export function VoterList({
  voters,
  sections,
}: {
  voters: Voter[];
  sections: string[];
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<Voter | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterSection, setFilterSection] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<
    { lrn: string; section: string }[] | null
  >(null);

  const filteredVoters = voters.filter((v) => {
    const matchSection = !filterSection || v.section.name === filterSection;
    const matchSearch =
      !searchQuery ||
      v.lrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.section.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSection && matchSearch;
  });

  async function handleCreate(formData: FormData) {
    setLoading(true);
    const result = await createVoter(formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Voter added.");
    setCreateOpen(false);
    router.refresh();
  }

  async function handleUpdate(formData: FormData) {
    setLoading(true);
    const result = await updateVoter(formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Voter updated.");
    setEditOpen(false);
    setSelected(null);
    router.refresh();
  }

  async function handleDelete() {
    if (!selected) return;
    setLoading(true);
    const result = await deleteVoter(selected.id);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Voter deleted.");
    setDeleteOpen(false);
    setSelected(null);
    router.refresh();
  }

  async function handleDeleteAll() {
    setLoading(true);
    await deleteAllVoters();
    setLoading(false);

    toast.success("All voters deleted.");
    setDeleteAllOpen(false);
    router.refresh();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = parseCSV(text);
      setImportPreview(rows);
    };
    reader.readAsText(file);
  }

  function parseCSV(text: string): { lrn: string; section: string }[] {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return [];

    // Detect if first row is a header
    const firstLine = lines[0].toLowerCase();
    const startIndex =
      firstLine.includes("lrn") || firstLine.includes("section") ? 1 : 0;

    const rows: { lrn: string; section: string }[] = [];
    for (let i = startIndex; i < lines.length; i++) {
      // Support comma and tab separators
      const parts = lines[i].split(/[,\t]/).map((p) => p.trim().replace(/^"|"$/g, ""));
      if (parts.length >= 2) {
        rows.push({ lrn: parts[0], section: parts[1] });
      }
    }
    return rows;
  }

  async function handleImport() {
    if (!importPreview || importPreview.length === 0) return;

    setLoading(true);
    const result = await importVoters(importPreview);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message ?? "Import complete.");
    setImportOpen(false);
    setImportPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    router.refresh();
  }

  const votedCount = voters.filter((v) => v.hasVoted).length;

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search LRN or section…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={filterSection}
          onChange={(e) => setFilterSection(e.target.value)}
        >
          <option value="">All sections</option>
          {sections.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="size-4" />
            Import CSV
          </Button>
          {voters.length > 0 && (
            <Button variant="outline" onClick={() => setDeleteAllOpen(true)}>
              <Trash className="size-4" />
              Delete All
            </Button>
          )}
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Add Voter
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>Total: {voters.length}</span>
        <span>Voted: {votedCount}</span>
        <span>Not voted: {voters.length - votedCount}</span>
        {filteredVoters.length !== voters.length && (
          <span>Showing: {filteredVoters.length}</span>
        )}
      </div>

      {/* Table */}
      {voters.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No voters yet.</p>
          <p className="text-sm text-muted-foreground">
            Add voters manually or import from a CSV file.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>LRN</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-12.5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVoters.map((voter) => (
                <TableRow key={voter.id}>
                  <TableCell className="font-mono">{voter.lrn}</TableCell>
                  <TableCell>{voter.section.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={voter.hasVoted ? "default" : "secondary"}
                    >
                      {voter.hasVoted ? "Voted" : "Not voted"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(voter.createdAt).toLocaleDateString()}
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
                        <DropdownMenuItem
                          onClick={() => {
                            setSelected(voter);
                            setEditOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => {
                            setSelected(voter);
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Voter</DialogTitle>
            <DialogDescription>
              Enter the voter&apos;s LRN and section.
            </DialogDescription>
          </DialogHeader>
          <form action={handleCreate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-voter-lrn">LRN</Label>
                <Input
                  id="create-voter-lrn"
                  name="lrn"
                  placeholder="e.g. 123456789012"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-voter-section">Section</Label>
                <Input
                  id="create-voter-section"
                  name="section"
                  placeholder="e.g. 12-STEM-A"
                  list="section-suggestions"
                  required
                />
                <datalist id="section-suggestions">
                  {sections.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? "Adding…" : "Add Voter"}
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
          if (!open) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Voter</DialogTitle>
            <DialogDescription>Update voter details.</DialogDescription>
          </DialogHeader>
          <form action={handleUpdate}>
            <input type="hidden" name="id" value={selected?.id ?? ""} />
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-voter-lrn">LRN</Label>
                <Input
                  id="edit-voter-lrn"
                  name="lrn"
                  defaultValue={selected?.lrn ?? ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-voter-section">Section</Label>
                <Input
                  id="edit-voter-section"
                  name="section"
                  defaultValue={selected?.section.name ?? ""}
                  list="section-suggestions-edit"
                  required
                />
                <datalist id="section-suggestions-edit">
                  {sections.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
            </div>
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
            <AlertDialogTitle>Delete Voter</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete voter with LRN &quot;
              {selected?.lrn}&quot;? This action cannot be undone.
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

      {/* Delete All Confirmation */}
      <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Voters</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all {voters.length} voter(s)?
              This will remove all voter records and their vote history. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} disabled={loading}>
              {loading ? "Deleting…" : "Delete All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open);
          if (!open) {
            setImportPreview(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Voters from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file with two columns: <strong>LRN</strong> and{" "}
              <strong>Section</strong>. A header row is optional.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="import-file">CSV File</Label>
              <Input
                id="import-file"
                type="file"
                accept=".csv,.txt,.tsv"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            </div>

            {importPreview && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Preview: {importPreview.length} row(s) detected
                </p>
                <div className="max-h-48 overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>LRN</TableHead>
                        <TableHead>Section</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importPreview.slice(0, 10).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-sm">
                            {row.lrn}
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.section}
                          </TableCell>
                        </TableRow>
                      ))}
                      {importPreview.length > 10 && (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="text-center text-sm text-muted-foreground"
                          >
                            …and {importPreview.length - 10} more row(s)
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={handleImport}
              disabled={loading || !importPreview?.length}
            >
              {loading
                ? "Importing…"
                : `Import ${importPreview?.length ?? 0} Voter(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
