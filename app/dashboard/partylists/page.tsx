import { getPartylists } from "@/actions/partylists";
import { PartylistList } from "@/components/dashboard/partylists/partylist-list";

export default async function PartylistsPage() {
  const partylists = await getPartylists();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Partylists</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage partylists for organizing candidates by group.
        </p>
      </div>
      <PartylistList partylists={partylists} />
    </div>
  );
}
