import { getElections } from "@/actions/elections";
import { ElectionList } from "@/components/dashboard/elections/election-list";

export default async function ElectionsPage() {
  const elections = await getElections();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Elections</h2>
          <p className="text-muted-foreground">
            Manage elections and their positions.
          </p>
        </div>
      </div>
      <ElectionList elections={elections} />
    </div>
  );
}
