"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function VoteSuccessPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

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
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="size-10 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">Vote Submitted!</CardTitle>
          <CardDescription className="text-base">
            Your vote has been recorded successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Thank you for participating in the election. Your selections have
            been securely saved.
          </p>
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
