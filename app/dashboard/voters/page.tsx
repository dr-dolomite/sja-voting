import { getVoters, getSections } from "@/actions/voters";
import { VoterList } from "@/components/dashboard/voters/voter-list";

export default async function VotersPage() {
  const [voters, sections] = await Promise.all([getVoters(), getSections()]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Voters</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage voter records and import from spreadsheets.
        </p>
      </div>
      <VoterList
        voters={voters}
        sections={sections.map((s) => s.name)}
      />
    </div>
  );
}
