"use client";

import { useActionState } from "react";
import { voterLoginAction } from "@/actions/voter-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function VoterLoginForm() {
  const [state, formAction, isPending] = useActionState(
    voterLoginAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="lrn">LRN (Learner Reference Number)</Label>
        <Input
          id="lrn"
          name="lrn"
          type="text"
          inputMode="numeric"
          placeholder="Enter your LRN"
          required
        />
      </div>

      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Verifying…" : "Proceed to Vote"}
      </Button>
    </form>
  );
}
