import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getElection } from "@/actions/elections";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PositionList } from "@/components/dashboard/elections/position-list";

export default async function ElectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const election = await getElection(id);

  if (!election) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/elections">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">
              {election.name}
            </h2>
            <Badge variant={election.isActive ? "default" : "secondary"}>
              {election.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Manage positions for this election.
          </p>
        </div>
      </div>

      <PositionList positions={election.positions} electionId={election.id} />
    </div>
  );
}
