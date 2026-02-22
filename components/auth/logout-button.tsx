"use client";

import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button variant="outline" size="sm" type="submit">
        Logout
      </Button>
    </form>
  );
}
