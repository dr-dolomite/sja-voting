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

import {
  createPartylist,
  updatePartylist,
  deletePartylist,
} from "@/actions/partylists";

type Partylist = {
  id: string;
  name: string;
  color: string | null;
  _count: { candidates: number };
};

export function PartylistList({ partylists }: { partylists: Partylist[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Partylist | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate(formData: FormData) {
    setLoading(true);
    const result = await createPartylist(formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Partylist created.");
    setCreateOpen(false);
    router.refresh();
  }

  async function handleUpdate(formData: FormData) {
    setLoading(true);
    const result = await updatePartylist(formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Partylist updated.");
    setEditOpen(false);
    setSelected(null);
    router.refresh();
  }

  async function handleDelete() {
    if (!selected) return;
    setLoading(true);
    const result = await deletePartylist(selected.id);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Partylist deleted.");
    setDeleteOpen(false);
    setSelected(null);
    router.refresh();
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-4" />
          Create Partylist
        </Button>
      </div>

      {partylists.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No partylists yet.</p>
          <p className="text-sm text-muted-foreground">
            Create partylists to organize candidates by group.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Candidates</TableHead>
                <TableHead className="w-12.5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {partylists.map((partylist) => (
                <TableRow key={partylist.id}>
                  <TableCell className="font-medium">
                    {partylist.name}
                  </TableCell>
                  <TableCell>
                    {partylist.color ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="size-4 rounded-full border"
                          style={{ backgroundColor: partylist.color }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {partylist.color}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{partylist._count.candidates}</TableCell>
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
                            setSelected(partylist);
                            setEditOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => {
                            setSelected(partylist);
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
            <DialogTitle>Create Partylist</DialogTitle>
            <DialogDescription>
              Add a new partylist to organize candidates.
            </DialogDescription>
          </DialogHeader>
          <form action={handleCreate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-pl-name">Name</Label>
                <Input
                  id="create-pl-name"
                  name="name"
                  placeholder="e.g. Independent"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-pl-color">
                  Color{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="create-pl-color"
                  name="color"
                  type="color"
                  defaultValue="#3b82f6"
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
            <DialogTitle>Edit Partylist</DialogTitle>
            <DialogDescription>
              Update partylist name and color.
            </DialogDescription>
          </DialogHeader>
          <form action={handleUpdate}>
            <input type="hidden" name="id" value={selected?.id ?? ""} />
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-pl-name">Name</Label>
                <Input
                  id="edit-pl-name"
                  name="name"
                  defaultValue={selected?.name ?? ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-pl-color">
                  Color{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="edit-pl-color"
                  name="color"
                  type="color"
                  defaultValue={selected?.color ?? "#3b82f6"}
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
            <AlertDialogTitle>Delete Partylist</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selected?.name}&quot;? This
              action cannot be undone. Partylists with assigned candidates
              cannot be deleted.
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
