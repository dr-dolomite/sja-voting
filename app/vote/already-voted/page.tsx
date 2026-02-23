"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AlreadyVotedPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.replace("/vote/login");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <ShieldCheck className="size-10 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl">Already Voted</CardTitle>
          <CardDescription className="text-base">
            You have already cast your vote. Thank you!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-dashed p-4">
            <p className="text-sm font-medium text-muted-foreground">
              If you believe there was an error, please contact your election
              administrator.
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            Redirecting to login in{" "}
            <span className="font-semibold">{countdown}</span> second
            {countdown !== 1 ? "s" : ""}…
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
