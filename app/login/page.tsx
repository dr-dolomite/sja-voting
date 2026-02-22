import { LoginForm } from "@/components/auth/login-form";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-lg space-y-6 p-6">
        <div className="space-y-2 text-center">
          <Image
            src="/sja-logo.webp"
            alt="SJA Logo"
            width={168}
            height={168}
            className="mx-auto"
          />
          <h1 className="text-2xl font-bold">
            Welcome to the SJA Voting System
          </h1>
          <p className="text-md font-medium text-muted-foreground">
            Sign in to access the admin dashboard.
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
