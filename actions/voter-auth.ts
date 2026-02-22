"use server";

import { db } from "@/lib/db";
import { signVoterToken, VOTER_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function voterLoginAction(
  _prevState: { error: string } | null,
  formData: FormData,
) {
  const lrn = (formData.get("lrn") as string)?.trim();

  if (!lrn) {
    return { error: "LRN is required." };
  }

  const voter = await db.voter.findUnique({
    where: { lrn },
    include: { section: true },
  });

  if (!voter) {
    return { error: "LRN not found. Please check and try again." };
  }

  if (voter.hasVoted) {
    return { error: "You have already voted." };
  }

  // Check if there's an active election
  const activeElection = await db.election.findFirst({
    where: { isActive: true },
  });

  if (!activeElection) {
    return { error: "No active election at this time." };
  }

  const token = await signVoterToken({
    voterId: voter.id,
    lrn: voter.lrn,
  });

  const cookieStore = await cookies();
  cookieStore.set(VOTER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4, // 4 hours
  });

  redirect("/vote");
}

export async function voterLogoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(VOTER_COOKIE);
  redirect("/vote/login");
}
