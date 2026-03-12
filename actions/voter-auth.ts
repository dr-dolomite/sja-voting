"use server";

import { db } from "@/lib/db";
import { signVoterToken, getVoterSession, VOTER_COOKIE, cookieOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logVoterAction } from "@/lib/logger";

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
    await logVoterAction({
      action: "VOTER_LOGIN_FAILED",
      category: "AUTH",
      severity: "WARNING",
      actorName: lrn,
      detail: `Voter login failed — LRN "${lrn}" not found`,
    });
    return { error: "LRN not found. Please check and try again." };
  }

  if (voter.hasVoted) {
    await logVoterAction({
      action: "VOTER_LOGIN_ALREADY_VOTED",
      category: "AUTH",
      severity: "WARNING",
      actorId: voter.id,
      actorName: voter.lrn,
      detail: `Voter LRN "${voter.lrn}" attempted login but has already voted`,
    });
    redirect("/vote/already-voted");
  }

  // Check if there's an active election
  const activeElection = await db.election.findFirst({
    where: { isActive: true },
    select: { id: true, _count: { select: { voters: true } } },
  });

  if (!activeElection) {
    await logVoterAction({
      action: "VOTER_LOGIN_NO_ELECTION",
      category: "AUTH",
      severity: "WARNING",
      actorId: voter.id,
      actorName: voter.lrn,
      detail: `Voter LRN "${voter.lrn}" attempted login but no active election`,
    });
    return { error: "No active election at this time." };
  }

  // If election has assigned voters, check this voter is one of them
  if (activeElection._count.voters > 0) {
    const isAssigned = await db.election.findFirst({
      where: {
        id: activeElection.id,
        voters: { some: { id: voter.id } },
      },
    });
    if (!isAssigned) {
      await logVoterAction({
        action: "VOTER_LOGIN_NOT_ASSIGNED",
        category: "AUTH",
        severity: "WARNING",
        actorId: voter.id,
        actorName: voter.lrn,
        detail: `Voter LRN "${voter.lrn}" (${voter.section.name}) not assigned to active election`,
      });
      return { error: "You are not eligible to vote in the current election." };
    }
  }

  const token = await signVoterToken({
    voterId: voter.id,
    lrn: voter.lrn,
  });

  const cookieStore = await cookies();
  // Clear any active admin session (mutually exclusive logins)
  cookieStore.delete("session");
  cookieStore.set(VOTER_COOKIE, token, cookieOptions(60 * 60 * 4));

  await logVoterAction({
    action: "VOTER_LOGIN_SUCCESS",
    category: "AUTH",
    actorId: voter.id,
    actorName: voter.lrn,
    detail: `Voter LRN "${voter.lrn}" (${voter.section.name}) logged in`,
    metadata: { sectionId: voter.sectionId, sectionName: voter.section.name },
  });

  redirect("/vote");
}

export async function voterLogoutAction() {
  const session = await getVoterSession();
  const cookieStore = await cookies();
  cookieStore.delete(VOTER_COOKIE);

  if (session) {
    await logVoterAction({
      action: "VOTER_LOGOUT",
      category: "AUTH",
      actorId: session.voterId,
      actorName: session.lrn,
      detail: `Voter LRN "${session.lrn}" logged out`,
    });
  }

  redirect("/vote/login");
}
