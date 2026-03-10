# Candidate Image Upload — Design Spec

**Date:** 2026-03-10
**Status:** Approved

## Summary

Add local image upload support for candidate photos. Images are stored in `public/uploads/candidates/` and served by Next.js as static files. The existing URL field is kept — the file picker auto-fills it. Orphaned files are cleaned up on candidate delete/update.

---

## Architecture

### Upload API Route

**`app/api/upload/candidate-image/route.ts`** — `POST` handler

- Auth check: valid admin session required (reads `session` cookie via `getSession()`); returns 401 otherwise
- Parses `multipart/form-data` via `request.formData()`
- Validation:
  - MIME type must be `image/jpeg`, `image/png`, or `image/webp`
  - File size ≤ 2 MB
- Generates filename: `crypto.randomUUID()` + extension derived from MIME type
- Saves to `public/uploads/candidates/<uuid>.<ext>` using `fs/promises`; creates directory if missing
- Returns `{ url: "/uploads/candidates/<uuid>.<ext>" }` on success
- Returns `{ error: "…" }` with appropriate HTTP status on failure

### Candidate Form UI

**`components/dashboard/candidates/candidate-list.tsx`**

The Image URL field is enhanced with a file picker:

```
[ 📎 Upload ]  [ text input: url or /uploads/candidates/… ]
[ avatar preview if URL is set ]
```

- Hidden `<input type="file" accept="image/jpeg,image/png,image/webp">` triggered by the Upload button
- On file selected: `fetch POST /api/upload/candidate-image` with `FormData`
  - During upload: button shows spinner, text input disabled
  - On success: text input value set to returned URL, inline avatar preview updates
  - On error: `toast.error(message)`, input unchanged
- URL field remains manually editable (remote URLs still work)
- State: `uploadingImage: boolean` per form context (create / edit are separate)

### Cleanup on Delete / Update

**`actions/candidates.ts`**

Helper `deleteLocalImage(url: string | null)`:
- If `url` starts with `/uploads/candidates/`, derive the filesystem path via `path.join(process.cwd(), "public", url)`
- Call `fs.unlink(path)` silently (ignore `ENOENT` — file already gone)

Called in:
- `deleteCandidate`: after DB delete, clean up `candidate.imageUrl`
- `updateCandidate`: before DB update, if old `imageUrl` differs from new one and old was a local upload, delete old file

---

## Files to Create / Modify

| File | Change |
|------|--------|
| `app/api/upload/candidate-image/route.ts` | **Create** — upload handler |
| `components/dashboard/candidates/candidate-list.tsx` | **Modify** — add file picker + preview to image field |
| `actions/candidates.ts` | **Modify** — add `deleteLocalImage` helper, call in delete/update |

No schema changes needed — `imageUrl String?` already exists on the `Candidate` model.

---

## Constraints

- Max file size: **2 MB**
- Accepted types: `image/jpeg`, `image/png`, `image/webp`
- Filenames: UUID-based to avoid collisions and path traversal
- Auth: upload route requires valid admin session
- No Next.js config changes needed — `public/` is already served as static

---

## Out of Scope

- Image resizing / compression
- Multiple images per candidate
- Cloud storage (S3, Cloudinary)
