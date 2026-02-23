"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Plus, Pencil, Trash2, Power, Eye } from "lucide-react";
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
  DropdownMenuSeparator,
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
  createElection,
  updateElection,
  toggleElection,
  deleteElection,
} from "@/actions/elections";

type Election = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  _count: { positions: number };
};

export function ElectionList({ elections }: { elections: Election[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Election | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate(formData: FormData) {
    setLoading(true);
    const result = await createElection(formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Election created.");
    setCreateOpen(false);
    router.refresh();
  }

  async function handleUpdate(formData: FormData) {
    setLoading(true);
    const result = await updateElection(formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Election updated.");
    setEditOpen(false);
    setSelected(null);
    router.refresh();
  }

  async function handleToggle(election: Election) {
    const result = await toggleElection(election.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(
      election.isActive ? "Election deactivated." : "Election activated.",
    );
    router.refresh();
  }

  async function handleDelete() {
    if (!selected) return;
    setLoading(true);
    const result = await deleteElection(selected.id);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Election deleted.");
    setDeleteOpen(false);
    setSelected(null);
    router.refresh();
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Create Election
        </Button>
      </div>

      {elections.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No elections yet.</p>
          <p className="text-sm text-muted-foreground">
            Create your first election to get started.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Positions</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12.5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {elections.map((election) => (
                <TableRow key={election.id}>
                  <TableCell className="font-medium">{election.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={election.isActive ? "default" : "secondary"}
                    >
                      {election.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{election._count.positions}</TableCell>
                  <TableCell>
                    {new Date(election.createdAt).toLocaleDateString()}
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
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/elections/${election.id}`}>
                            <Eye className="size-4" />
                            View Positions
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelected(election);
                            setEditOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                          Edit Name
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggle(election)}
                        >
                          <Power className="size-4" />
                          {election.isActive ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => {
                            setSelected(election);
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
            <DialogTitle>Create Election</DialogTitle>
            <DialogDescription>
              Give your election a name (e.g. &quot;SY 2025–2026 Student
              Council&quot;).
            </DialogDescription>
          </DialogHeader>
          <form action={handleCreate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Name</Label>
                <Input
                  id="create-name"
                  name="name"
                  placeholder="Election name"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating…" : "Create"}
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
            <DialogTitle>Edit Election</DialogTitle>
            <DialogDescription>Update the election name.</DialogDescription>
          </DialogHeader>
          <form action={handleUpdate}>
            <input type="hidden" name="id" value={selected?.id ?? ""} />
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={selected?.name ?? ""}
                  required
                />
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
            <AlertDialogTitle>Delete Election</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selected?.name}&quot;? This
              will also remove all positions and candidates under it. This
              action cannot be undone.
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
