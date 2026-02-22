import { getElectionsForResults } from "@/actions/results";
import { VoteCountsPage } from "@/components/dashboard/results/vote-counts";

export default async function VoteCountsRoute() {
  const elections = await getElectionsForResults();

  return <VoteCountsPage elections={elections} />;
}
