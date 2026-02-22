"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// ─── Section helpers ────────────────────────────────────────────

export async function getSections() {
  return db.section.findMany({ orderBy: { name: "asc" } });
}

// ─── Voter queries ──────────────────────────────────────────────

export async function getVoters() {
  return db.voter.findMany({
    include: { section: true },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Voter CRUD ─────────────────────────────────────────────────

export async function createVoter(formData: FormData) {
  const lrn = (formData.get("lrn") as string)?.trim();
  const sectionName = (formData.get("section") as string)?.trim();

  if (!lrn) return { error: "LRN is required." };
  if (!sectionName) return { error: "Section is required." };

  const existing = await db.voter.findUnique({ where: { lrn } });
  if (existing) return { error: "A voter with this LRN already exists." };

  // Find or create section
  const section = await db.section.upsert({
    where: { name: sectionName },
    update: {},
    create: { name: sectionName },
  });

  await db.voter.create({ data: { lrn, sectionId: section.id } });
  revalidatePath("/dashboard/voters");
  return { success: true };
}

export async function updateVoter(formData: FormData) {
  const id = formData.get("id") as string;
  const lrn = (formData.get("lrn") as string)?.trim();
  const sectionName = (formData.get("section") as string)?.trim();

  if (!lrn) return { error: "LRN is required." };
  if (!sectionName) return { error: "Section is required." };

  // Check uniqueness (exclude self)
  const existing = await db.voter.findFirst({
    where: { lrn, id: { not: id } },
  });
  if (existing) return { error: "A voter with this LRN already exists." };

  const section = await db.section.upsert({
    where: { name: sectionName },
    update: {},
    create: { name: sectionName },
  });

  await db.voter.update({ where: { id }, data: { lrn, sectionId: section.id } });
  revalidatePath("/dashboard/voters");
  return { success: true };
}

export async function deleteVoter(id: string) {
  try {
    await db.voter.delete({ where: { id } });
    revalidatePath("/dashboard/voters");
    return { success: true };
  } catch {
    return { error: "Failed to delete voter." };
  }
}

export async function deleteAllVoters() {
  await db.voter.deleteMany();
  revalidatePath("/dashboard/voters");
  return { success: true };
}

// ─── Spreadsheet import ─────────────────────────────────────────

export async function importVoters(
  rows: { lrn: string; section: string }[],
) {
  if (!rows.length) return { error: "No data to import." };

  // Validate all rows first
  const errors: string[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const { lrn, section } = rows[i];
    if (!lrn?.trim()) {
      errors.push(`Row ${i + 1}: LRN is empty.`);
      continue;
    }
    if (!section?.trim()) {
      errors.push(`Row ${i + 1}: Section is empty.`);
      continue;
    }
    if (seen.has(lrn.trim())) {
      errors.push(`Row ${i + 1}: Duplicate LRN "${lrn.trim()}" in file.`);
      continue;
    }
    seen.add(lrn.trim());
  }

  if (errors.length > 0) {
    return { error: errors.slice(0, 5).join("\n") + (errors.length > 5 ? `\n…and ${errors.length - 5} more errors.` : "") };
  }

  // Collect unique sections
  const sectionNames = [...new Set(rows.map((r) => r.section.trim()))];

  // Upsert all sections
  const sectionMap = new Map<string, string>();
  for (const name of sectionNames) {
    const section = await db.section.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    sectionMap.set(name, section.id);
  }

  // Batch create voters, skipping existing LRNs
  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const lrn = row.lrn.trim();
    const sectionId = sectionMap.get(row.section.trim())!;

    const existing = await db.voter.findUnique({ where: { lrn } });
    if (existing) {
      skipped++;
      continue;
    }

    await db.voter.create({ data: { lrn, sectionId } });
    imported++;
  }

  revalidatePath("/dashboard/voters");

  const message =
    skipped > 0
      ? `Imported ${imported} voter(s). Skipped ${skipped} existing LRN(s).`
      : `Imported ${imported} voter(s).`;

  return { success: true, message };
}
