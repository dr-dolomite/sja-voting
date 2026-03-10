# Candidate Image Upload Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local image upload for candidate photos, storing files in `public/uploads/candidates/` and served by Next.js, while keeping the existing URL field working.

**Architecture:** A `POST /api/upload/candidate-image` route handler accepts multipart form data, validates and saves the file with a UUID filename, and returns the public path. The candidate form adds a file picker that calls this route and auto-fills the URL field. Delete/update actions clean up orphaned local files.

**Tech Stack:** Next.js 16 App Router, Node `fs/promises`, `crypto.randomUUID()`, TypeScript. No new dependencies. Build command: `bun run build`. No test framework — use build + manual smoke test.

**Spec:** `docs/superpowers/specs/2026-03-10-candidate-image-upload-design.md`

---

## Chunk 1: Upload API Route

### Task 1: Create the upload route handler

**Files:**
- Create: `app/api/upload/candidate-image/route.ts`

The route:
1. Checks for a valid admin session (uses existing `getSession()` from `@/lib/auth`)
2. Parses the file from `multipart/form-data`
3. Validates MIME type and file size (≤ 2 MB)
4. Saves to `public/uploads/candidates/<uuid>.<ext>`
5. Returns `{ url }` or `{ error }`

- [ ] **Step 1: Create the route file**

```typescript
// app/api/upload/candidate-image/route.ts
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "candidates");

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.adminId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 2 MB." },
      { status: 400 },
    );
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(join(UPLOAD_DIR, filename), buffer);

  return NextResponse.json({ url: `/uploads/candidates/${filename}` });
}
```

- [ ] **Step 2: Verify build passes**

```bash
bun run build
```
Expected: `✓ Compiled successfully` with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/upload/candidate-image/route.ts
git commit -m "feat: add candidate image upload API route"
```

---

## Chunk 2: Cleanup on Delete / Update

### Task 2: Add `deleteLocalImage` helper and wire into candidate actions

**Files:**
- Modify: `actions/candidates.ts`

The helper deletes a file from disk only if the URL is a local upload (starts with `/uploads/candidates/`). It silences `ENOENT` errors (file already gone). Called in `deleteCandidate`, `deleteCandidates` (bulk), and `updateCandidate`.

- [ ] **Step 1: Add the helper and update `deleteCandidate`**

Add this import at the top of `actions/candidates.ts`:

```typescript
import { unlink } from "fs/promises";
import { join } from "path";
```

Add this helper function after the imports block:

```typescript
async function deleteLocalImage(imageUrl: string | null | undefined) {
  if (!imageUrl?.startsWith("/uploads/candidates/")) return;
  try {
    await unlink(join(process.cwd(), "public", imageUrl));
  } catch {
    // File already gone — ignore
  }
}
```

Update `deleteCandidate` to call it after fetching the candidate:

```typescript
export async function deleteCandidate(id: string) {
  const candidate = await db.candidate.findUnique({
    where: { id },
    include: { position: true },
  });
  try {
    await db.candidate.delete({ where: { id } });
    await deleteLocalImage(candidate?.imageUrl);  // ADD THIS LINE

    const session = await getSession();
    // ... rest unchanged
```

- [ ] **Step 2: Update `deleteCandidates` (bulk) to clean up images**

In `deleteCandidates`, add `imageUrl` to the `findMany` select and call cleanup after DB delete:

```typescript
export async function deleteCandidates(ids: string[]) {
  if (!ids.length) return { error: "No candidates selected." };

  const candidates = await db.candidate.findMany({
    where: { id: { in: ids } },
    include: { position: true },
    // imageUrl is already on the model, no extra include needed
  });

  try {
    await db.candidate.deleteMany({ where: { id: { in: ids } } });

    // Clean up any local images
    await Promise.all(candidates.map((c) => deleteLocalImage(c.imageUrl)));

    const session = await getSession();
    // ... rest unchanged
```

- [ ] **Step 3: Update `updateCandidate` to clean up replaced images**

In `updateCandidate`, after fetching `existing`, add cleanup before the DB update:

```typescript
  const existing = await db.candidate.findUnique({ where: { id } });

  // If the image is being replaced with a different one, delete the old local file
  if (existing?.imageUrl !== imageUrl) {
    await deleteLocalImage(existing?.imageUrl);
  }

  await db.candidate.update({
    where: { id },
    data: { fullName, description, imageUrl, positionId, partylistId },
  });
```

- [ ] **Step 4: Verify build passes**

```bash
bun run build
```
Expected: `✓ Compiled successfully`

- [ ] **Step 5: Commit**

```bash
git add actions/candidates.ts
git commit -m "feat: clean up local candidate images on delete/update"
```

---

## Chunk 3: Candidate Form UI

### Task 3: Add file picker + preview to candidate form

**Files:**
- Modify: `components/dashboard/candidates/candidate-list.tsx`

**Context on the existing code:**
- `renderFormFields(defaults?)` is a shared function used for both the Create and Edit dialogs
- `imageUrl` is currently passed as `defaultValue` (uncontrolled)
- We need controlled state for `imageUrl` so the upload result auto-fills it
- Following the existing pattern used for partylist colors (`createColor` / `editColor`), add `createImageUrl` and `editImageUrl` state

- [ ] **Step 1: Add `Upload` and `Loader2` icon imports**

In the imports block at the top of `candidate-list.tsx`, add to the lucide import line:

```typescript
import { MoreHorizontal, Plus, Pencil, Trash2, Upload, Loader2 } from "lucide-react";
```

- [ ] **Step 2: Add image URL state and upload handler**

After the existing `useState` declarations at the top of `VoterList` / `CandidateList`, add:

```typescript
const [createImageUrl, setCreateImageUrl] = useState("");
const [editImageUrl, setEditImageUrl] = useState("");
const [uploadingImage, setUploadingImage] = useState(false);
```

Add a shared upload handler:

```typescript
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
```

- [ ] **Step 3: Wire `editImageUrl` when opening the edit dialog**

Find the edit dropdown item (around line 170 of the current file). Update it to also set `editImageUrl`:

```typescript
<DropdownMenuItem
  onClick={() => {
    setSelected(candidate);
    setEditImageUrl(candidate.imageUrl ?? "");
    setEditOpen(true);
  }}
>
```

Also reset `createImageUrl` when the create dialog closes, and reset `editImageUrl` when the edit dialog closes:

```typescript
// Create dialog onOpenChange:
onOpenChange={(open) => {
  setCreateOpen(open);
  if (!open) setCreateImageUrl("");
}}

// Edit dialog onOpenChange:
onOpenChange={(open) => {
  setEditOpen(open);
  if (!open) { setSelected(null); setEditImageUrl(""); }
}}
```

- [ ] **Step 4: Update `renderFormFields` to accept image state props**

Change the signature of `renderFormFields` to accept image URL value and setter, plus a hidden `<input>` for form submission:

```typescript
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
```

Replace the current Image URL field inside `renderFormFields` with:

```tsx
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
        onError={() => {/* broken image — do nothing */}}
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
```

- [ ] **Step 5: Update the two call sites of `renderFormFields`**

Create dialog:
```tsx
{renderFormFields(undefined, createImageUrl, setCreateImageUrl)}
```

Edit dialog:
```tsx
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
```

Also clear `createImageUrl` after successful create in `handleCreate`:
```typescript
toast.success("Candidate created.");
setCreateOpen(false);
setCreateImageUrl("");
router.refresh();
```

- [ ] **Step 6: Verify build passes**

```bash
bun run build
```
Expected: `✓ Compiled successfully` with no TypeScript errors.

- [ ] **Step 7: Manual smoke test**

1. Open `/dashboard/candidates` → click **Add Candidate**
2. Click **Upload** → select a JPEG/PNG/WebP (< 2 MB)
3. Verify: spinner shows briefly, URL field fills with `/uploads/candidates/<uuid>.jpg`, avatar preview appears
4. Submit the form — candidate should appear in table with the photo
5. Try editing the candidate and uploading a different image — old file should be deleted from `public/uploads/candidates/`
6. Delete the candidate — file should be removed from `public/uploads/candidates/`
7. Try uploading a file > 2 MB or wrong type (e.g. `.gif`) — expect toast error

- [ ] **Step 8: Commit**

```bash
git add components/dashboard/candidates/candidate-list.tsx
git commit -m "feat: add image upload picker to candidate form"
```

---

## Final State

After all tasks:

| File | Change |
|------|--------|
| `app/api/upload/candidate-image/route.ts` | New — upload handler |
| `actions/candidates.ts` | `deleteLocalImage` helper + cleanup in delete/update |
| `components/dashboard/candidates/candidate-list.tsx` | File picker + preview in image field |

No schema changes. No new dependencies. `public/uploads/candidates/` is created on first upload and gitignored (add to `.gitignore` to avoid committing photos).

> **Note:** Add `public/uploads/` to `.gitignore` to avoid accidentally committing candidate photos to the repository.
