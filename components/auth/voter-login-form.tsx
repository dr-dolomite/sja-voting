"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { useActionState } from "react";
import { voterLoginAction } from "@/actions/voter-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TriangleAlertIcon, User2Icon } from "lucide-react";

export function VoterLoginForm() {
  const [state, formAction, isPending] = useActionState(voterLoginAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="lrn">Learner Reference Number</Label>
        <InputGroup>
          <InputGroupInput
            id="lrn"
            name="lrn"
            type="text"
            inputMode="numeric"
            placeholder="Enter your LRN"
            required
          />
          <InputGroupAddon>
            <User2Icon />
          </InputGroupAddon>
        </InputGroup>
      </div>

      {state?.error && (
        <div className="flex items-center gap-x-2">
          <TriangleAlertIcon className="size-5 text-red-500" />
          <p className="text-sm text-red-500">{state.error}</p>
        </div>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={isPending}>
        {isPending ? "Verifying…" : "Proceed to Vote"}
      </Button>
    </form>
  );
}
