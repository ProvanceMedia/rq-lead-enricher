"use client";

import * as React from "react";
import { signOut } from "next-auth/react";

import { Button, type ButtonProps } from "@/components/ui/button";

type SignOutButtonProps = ButtonProps;

export function SignOutButton({
  children = "Sign out",
  onClick,
  ...props
}: SignOutButtonProps) {
  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) {
      return;
    }
    event.preventDefault();
    await signOut({ callbackUrl: "/auth/sign-in" });
  };

  return (
    <Button {...props} onClick={handleClick}>
      {children}
    </Button>
  );
}
