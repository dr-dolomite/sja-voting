import { VoterLoginForm } from "@/components/auth/voter-login-form";

export default function VoterLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Student Voting</h1>
          <p className="text-sm text-muted-foreground">
            Enter your LRN to cast your vote
          </p>
        </div>

        <VoterLoginForm />
      </div>
    </div>
  );
}
