import { getActiveElection } from "@/actions/results";
import { LiveResults } from "@/components/live/live-results";

export const metadata = {
  title: "Live Election Results",
};

export default async function LivePage() {
  const activeElection = await getActiveElection();

  return <LiveResults activeElection={activeElection} />;
}
