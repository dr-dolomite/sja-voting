"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { useActionState } from "react";
import { loginAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { EyeOffIcon, TriangleAlertIcon } from "lucide-react";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <form action={formAction} className="space-y-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="username">Username</FieldLabel>
          <Input
            id="username"
            name="username"
            type="text"
            placeholder="Enter username"
            required
          />
        </Field>
      </FieldGroup>

      <div className="grid gap-3">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="password"
                name="password"
                type="password"
                placeholder="Enter password"
                required
              />
              <InputGroupAddon align="inline-end">
                <EyeOffIcon />
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
        {isPending ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
}
