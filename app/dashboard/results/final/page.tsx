import { getElectionsForResults } from "@/actions/results";
import { FinalResults } from "@/components/dashboard/results/final-results";

export default async function FinalResultsRoute() {
  const elections = await getElectionsForResults();

  return <FinalResults elections={elections} />;
}
