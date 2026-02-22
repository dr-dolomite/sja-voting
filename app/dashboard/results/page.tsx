import { getElectionsForResults } from "@/actions/results";
import { ResultsDashboard } from "@/components/dashboard/results/results-dashboard";

export default async function ResultsPage() {
  const elections = await getElectionsForResults();

  return <ResultsDashboard elections={elections} />;
}
