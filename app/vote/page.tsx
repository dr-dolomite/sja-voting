import { redirect } from "next/navigation";
import { getVoterSession } from "@/lib/auth";
import { getActiveBallot } from "@/actions/vote";
import { db } from "@/lib/db";
import { BallotForm } from "@/components/vote/ballot-form";

export default async function VotePage() {
  const session = await getVoterSession();
  if (!session) redirect("/vote/login");

  // Check if voter already voted
  const voter = await db.voter.findUnique({
    where: { id: session.voterId },
  });

  if (!voter) redirect("/vote/login");
  if (voter.hasVoted) redirect("/vote/already-voted");

  const election = await getActiveBallot();

  if (!election) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">No Active Election</h1>
          <p className="text-muted-foreground">
            There is no active election at this time.
          </p>
        </div>
      </div>
    );
  }

  return <BallotForm election={election} />;
}
