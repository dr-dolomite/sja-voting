import {
  getCandidates,
  getPositionsWithElections,
} from "@/actions/candidates";
import { getPartylists } from "@/actions/partylists";
import { CandidateList } from "@/components/dashboard/candidates/candidate-list";

export default async function CandidatesPage() {
  const [candidates, elections, partylists] = await Promise.all([
    getCandidates(),
    getPositionsWithElections(),
    getPartylists(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Candidates</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage candidates, photos, and party assignments.
        </p>
      </div>
      <CandidateList
        candidates={candidates}
        elections={elections}
        partylists={partylists}
      />
    </div>
  );
}
