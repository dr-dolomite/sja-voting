import { CheckCircle2 } from "lucide-react";

export default function AlreadyVotedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto size-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Already Voted</h1>
        <p className="text-muted-foreground">
          You have already cast your vote. Thank you!
        </p>
      </div>
    </div>
  );
}
