"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { useActionState } from "react";
import { voterLoginAction } from "@/actions/voter-auth";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { TriangleAlertIcon, User2Icon } from "lucide-react";

export function VoterLoginForm() {
  const [state, formAction, isPending] = useActionState(voterLoginAction, null);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-3">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="username">Username</FieldLabel>
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
          </Field>
        </FieldGroup>

        {state?.error && (
          <div className="flex items-center gap-x-2">
            <TriangleAlertIcon className="size-5 text-red-500" />
            <p className="text-sm text-red-500">{state.error}</p>
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={isPending}>
        {isPending ? "Verifying…" : "Proceed to Vote"}
      </Button>
    </form>
  );
}
