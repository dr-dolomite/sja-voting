"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  assignSectionToElection,
  unassignSectionFromElection,
} from "@/actions/elections";

type SectionAssignment = {
  id: string;
  name: string;
  gradeLevel: string;
  totalVoters: number;
  assignedVoters: number;
  isFullyAssigned: boolean;
};

export function ElectionVoters({
  electionId,
  sections,
}: {
  electionId: string;
  sections: SectionAssignment[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loadingSection, setLoadingSection] = useState<string | null>(null);

  const totalAssigned = sections.reduce((sum, s) => sum + s.assignedVoters, 0);
  const totalVoters = sections.reduce((sum, s) => sum + s.totalVoters, 0);

  function handleToggle(section: SectionAssignment) {
    setLoadingSection(section.id);
    startTransition(async () => {
      try {
        const action = section.isFullyAssigned
          ? unassignSectionFromElection
          : assignSectionToElection;

        await action(electionId, section.id);

        toast.success(
          section.isFullyAssigned
            ? `Unassigned ${section.name}`
            : `Assigned ${section.name}`,
        );
      } catch {
        toast.error("Failed to update assignment.");
      }

      setLoadingSection(null);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5" />
              Voter Assignment
            </CardTitle>
            <CardDescription>
              Assign sections to this election. Only assigned voters will be able
              to vote. If no sections are assigned, all voters are eligible.
            </CardDescription>
          </div>
          <Badge variant="secondary">
            {totalAssigned}/{totalVoters} voters assigned
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {sections.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No sections found. Add sections and voters first.
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Section</TableHead>
                  <TableHead>Grade Level</TableHead>
                  <TableHead>Voters</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sections.map((section) => (
                  <TableRow key={section.id}>
                    <TableCell>
                      <Checkbox
                        checked={section.isFullyAssigned}
                        onCheckedChange={() => handleToggle(section)}
                        disabled={
                          pending && loadingSection === section.id
                        }
                        aria-label={`Assign ${section.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {section.name}
                    </TableCell>
                    <TableCell>{section.gradeLevel}</TableCell>
                    <TableCell>{section.totalVoters}</TableCell>
                    <TableCell>
                      {section.isFullyAssigned ? (
                        <Badge variant="default">Assigned</Badge>
                      ) : section.assignedVoters > 0 ? (
                        <Badge variant="secondary">
                          Partial ({section.assignedVoters}/{section.totalVoters})
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not assigned</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
