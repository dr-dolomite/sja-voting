import { VoterLoginForm } from "@/components/auth/voter-login-form";
import Image from "next/image";

export default function VoterLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-lg space-y-10 p-6">
        <div className="space-y-2 text-center">
          <Image
            src="/sja-logo.webp"
            alt="SJA Logo"
            width={168}
            height={168}
            className="mx-auto"
          />

          <h1 className="text-3xl font-bold">
            Welcome to the SJA Voting System
          </h1>
          <p className="text-md font-medium text-muted-foreground">
            Enter your LRN to cast your vote
          </p>
        </div>

        <VoterLoginForm />
      </div>
    </div>
  );
}
