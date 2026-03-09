"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";

import {
  createPosition,
  updatePosition,
  deletePosition,
} from "@/actions/positions";

type Position = {
  id: string;
  name: string;
  order: number;
  maxVotes: number;
  gradeLevels: string[];
  electionId: string;
  _count: { candidates: number };
};

const GRADE_LEVELS = [
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
];

export function PositionList({
  positions,
  electionId,
}: {
  positions: Position[];
  electionId: string;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Position | null>(null);
  const [loading, setLoading] = useState(false);
  const [createGradeLevels, setCreateGradeLevels] = useState<Set<string>>(
    new Set(),
  );
  const [editGradeLevels, setEditGradeLevels] = useState<Set<string>>(
    new Set(),
  );

  async function handleCreate(formData: FormData) {
    setLoading(true);
    formData.set("electionId", electionId);
    for (const gl of createGradeLevels) {
      formData.append("gradeLevel", gl);
    }
    const result = await createPosition(formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Position added.");
    setCreateOpen(false);
    setCreateGradeLevels(new Set());
    router.refresh();
  }

  async function handleUpdate(formData: FormData) {
    setLoading(true);
    formData.set("electionId", electionId);
    for (const gl of editGradeLevels) {
      formData.append("gradeLevel", gl);
    }
    const result = await updatePosition(formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Position updated.");
    setEditOpen(false);
    setSelected(null);
    setEditGradeLevels(new Set());
    router.refresh();
  }

  async function handleDelete() {
    if (!selected) return;
    setLoading(true);
    const result = await deletePosition(selected.id, electionId);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Position deleted.");
    setDeleteOpen(false);
    setSelected(null);
    router.refresh();
  }

  // Suggest next order number for convenience
  const nextOrder =
    positions.length > 0 ? Math.max(...positions.map((p) => p.order)) + 1 : 1;

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Add Position
        </Button>
      </div>

      {positions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No positions yet.</p>
          <p className="text-sm text-muted-foreground">
            Add positions like President, Vice President, etc.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Order</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Grade Level</TableHead>
                <TableHead>Max Votes</TableHead>
                <TableHead>Candidates</TableHead>
                <TableHead className="w-12.5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((position) => (
                <TableRow key={position.id}>
                  <TableCell>{position.order}</TableCell>
                  <TableCell className="font-medium">{position.name}</TableCell>
                  <TableCell>
                    {position.gradeLevels.length > 0
                      ? position.gradeLevels.join(", ")
                      : "All Grades"}
                  </TableCell>
                  <TableCell>{position.maxVotes}</TableCell>
                  <TableCell>{position._count.candidates}</TableCell>
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
                            setSelected(position);
                            setEditGradeLevels(new Set(position.gradeLevels));
                            setEditOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => {
                            setSelected(position);
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 size-4" />
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
            <DialogTitle>Add Position</DialogTitle>
            <DialogDescription>
              Add a new position to this election (e.g. President, Vice
              President).
            </DialogDescription>
          </DialogHeader>
          <form action={handleCreate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-pos-name">Position Name</Label>
                <Input
                  id="create-pos-name"
                  name="name"
                  placeholder="e.g. President"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Grade Levels</Label>
                <p className="text-xs text-muted-foreground">
                  Select which grades can vote for this position. Leave all
                  unchecked for all grades.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {GRADE_LEVELS.map((gl) => (
                    <label
                      key={gl}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={createGradeLevels.has(gl)}
                        onCheckedChange={(checked) => {
                          setCreateGradeLevels((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(gl);
                            else next.delete(gl);
                            return next;
                          });
                        }}
                      />
                      {gl}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-pos-order">Display Order</Label>
                  <Input
                    id="create-pos-order"
                    name="order"
                    type="number"
                    min={1}
                    defaultValue={nextOrder}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-pos-maxvotes">Max Votes</Label>
                  <Input
                    id="create-pos-maxvotes"
                    name="maxVotes"
                    type="number"
                    min={1}
                    defaultValue={1}
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? "Adding…" : "Add Position"}
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
            <DialogTitle>Edit Position</DialogTitle>
            <DialogDescription>Update position details.</DialogDescription>
          </DialogHeader>
          <form action={handleUpdate}>
            <input type="hidden" name="id" value={selected?.id ?? ""} />
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-pos-name">Position Name</Label>
                <Input
                  id="edit-pos-name"
                  name="name"
                  defaultValue={selected?.name ?? ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Grade Levels</Label>
                <p className="text-xs text-muted-foreground">
                  Select which grades can vote for this position. Leave all
                  unchecked for all grades.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {GRADE_LEVELS.map((gl) => (
                    <label
                      key={gl}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={editGradeLevels.has(gl)}
                        onCheckedChange={(checked) => {
                          setEditGradeLevels((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(gl);
                            else next.delete(gl);
                            return next;
                          });
                        }}
                      />
                      {gl}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-pos-order">Display Order</Label>
                  <Input
                    id="edit-pos-order"
                    name="order"
                    type="number"
                    min={1}
                    defaultValue={selected?.order ?? 1}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-pos-maxvotes">Max Votes</Label>
                  <Input
                    id="edit-pos-maxvotes"
                    name="maxVotes"
                    type="number"
                    min={1}
                    defaultValue={selected?.maxVotes ?? 1}
                    required
                  />
                </div>
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
            <AlertDialogTitle>Delete Position</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selected?.name}&quot;? All
              candidates under this position will also be removed. This action
              cannot be undone.
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
    </>
  );
}
